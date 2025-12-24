/**
 * Servicio de Team Ranking - Análisis de Equipos Competitivos
 * Cobblemon Los Pitufos - Backend API
 * 
 * Analiza la sinergia, composición y estrategia de los equipos de los jugadores.
 * Requiere mínimo 3 Pokémon en el party para calificar.
 * 
 * CARACTERÍSTICAS:
 * - Análisis de sinergia de tipos
 * - Evaluación de roles (sweeper, tank, support, etc.)
 * - Cobertura de tipos ofensiva/defensiva
 * - Análisis de IA épico estilo comentarista
 * - Anonimato total (especies ocultas)
 */

import { Collection, Decimal128 } from 'mongodb';
import { User, Pokemon } from '../../shared/types/user.types.js';
import { LevelCapsDocument } from '../../shared/types/level-caps.types.js';
import { env } from '../../config/env.js';

// ============================================
// TIPOS E INTERFACES
// ============================================

interface TypeCoverage {
  offensive: string[];  // Tipos que el equipo puede golpear super efectivo
  defensive: string[];  // Tipos contra los que el equipo resiste
  weaknesses: string[]; // Debilidades compartidas del equipo
}

interface TeamRole {
  sweepers: number;      // Atacantes rápidos
  tanks: number;         // Defensivos
  wallBreakers: number;  // Rompe-muros
  supports: number;      // Soporte/utility
  pivots: number;        // Pokémon de rotación
}

interface TeamMemberAnalysis {
  slot: number;
  level: number;
  ivTotal: number;
  evTotal: number;
  nature: string;
  shiny: boolean;
  estimatedRole: string;
  powerContribution: number;
}

export interface TeamScore {
  // Identificación (privada)
  _ownerUuid: string;
  _teamComposition: string[]; // Especies ocultas

  // Datos públicos
  ownerUsername: string;
  teamSize: number;

  // Puntajes detallados
  totalScore: Decimal128;
  totalScoreDisplay: number;
  
  // Desglose de puntaje
  scoreBreakdown: {
    rawPower: number;        // Poder bruto del equipo
    synergyBonus: number;    // Bonus por sinergia de tipos
    coverageBonus: number;   // Bonus por cobertura
    balanceBonus: number;    // Bonus por balance de roles
    ivQuality: number;       // Calidad de IVs promedio
    evTraining: number;      // Entrenamiento de EVs
    shinyBonus: number;      // Bonus por shinies
  };

  // Análisis del equipo
  teamAnalysis: {
    members: TeamMemberAnalysis[];
    typeCoverage: TypeCoverage;
    roleDistribution: TeamRole;
    avgLevel: number;
    avgIvs: number;
    avgEvs: number;
    shinyCount: number;
  };

  // Métricas de sinergia
  synergyMetrics: {
    typeBalance: number;      // 0-100: Qué tan balanceados están los tipos
    offensiveCoverage: number; // 0-100: Cobertura ofensiva
    defensiveCoverage: number; // 0-100: Cobertura defensiva
    roleBalance: number;       // 0-100: Balance de roles
    overallSynergy: number;    // 0-100: Sinergia general
  };

  // Metadata
  rank: number;
  calculatedAt: Date;
  grokAnalysis?: string;
}

export interface TeamRankingResponse {
  rankings: TeamScore[];
  totalTeamsAnalyzed: number;
  totalPlayersChecked: number;
  lastCalculated: Date;
  nextUpdate: Date;
  grokMasterAnalysis?: string;
  currentLevelCap: number;
  minimumTeamSize: number;
}

// Cache del ranking
let cachedTeamRanking: TeamRankingResponse | null = null;
let lastTeamCalculation: Date | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutos

// ============================================
// DATOS DE TIPOS POKÉMON
// ============================================

const TYPE_CHART: Record<string, { weakTo: string[]; resistsTo: string[]; immuneTo: string[] }> = {
  normal: { weakTo: ['fighting'], resistsTo: [], immuneTo: ['ghost'] },
  fire: { weakTo: ['water', 'ground', 'rock'], resistsTo: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'], immuneTo: [] },
  water: { weakTo: ['electric', 'grass'], resistsTo: ['fire', 'water', 'ice', 'steel'], immuneTo: [] },
  electric: { weakTo: ['ground'], resistsTo: ['electric', 'flying', 'steel'], immuneTo: [] },
  grass: { weakTo: ['fire', 'ice', 'poison', 'flying', 'bug'], resistsTo: ['water', 'electric', 'grass', 'ground'], immuneTo: [] },
  ice: { weakTo: ['fire', 'fighting', 'rock', 'steel'], resistsTo: ['ice'], immuneTo: [] },
  fighting: { weakTo: ['flying', 'psychic', 'fairy'], resistsTo: ['bug', 'rock', 'dark'], immuneTo: [] },
  poison: { weakTo: ['ground', 'psychic'], resistsTo: ['grass', 'fighting', 'poison', 'bug', 'fairy'], immuneTo: [] },
  ground: { weakTo: ['water', 'grass', 'ice'], resistsTo: ['poison', 'rock'], immuneTo: ['electric'] },
  flying: { weakTo: ['electric', 'ice', 'rock'], resistsTo: ['grass', 'fighting', 'bug'], immuneTo: ['ground'] },
  psychic: { weakTo: ['bug', 'ghost', 'dark'], resistsTo: ['fighting', 'psychic'], immuneTo: [] },
  bug: { weakTo: ['fire', 'flying', 'rock'], resistsTo: ['grass', 'fighting', 'ground'], immuneTo: [] },
  rock: { weakTo: ['water', 'grass', 'fighting', 'ground', 'steel'], resistsTo: ['normal', 'fire', 'poison', 'flying'], immuneTo: [] },
  ghost: { weakTo: ['ghost', 'dark'], resistsTo: ['poison', 'bug'], immuneTo: ['normal', 'fighting'] },
  dragon: { weakTo: ['ice', 'dragon', 'fairy'], resistsTo: ['fire', 'water', 'electric', 'grass'], immuneTo: [] },
  dark: { weakTo: ['fighting', 'bug', 'fairy'], resistsTo: ['ghost', 'dark'], immuneTo: ['psychic'] },
  steel: { weakTo: ['fire', 'fighting', 'ground'], resistsTo: ['normal', 'grass', 'ice', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'steel', 'fairy'], immuneTo: ['poison'] },
  fairy: { weakTo: ['poison', 'steel'], resistsTo: ['fighting', 'bug', 'dark'], immuneTo: ['dragon'] },
};

const ALL_TYPES = Object.keys(TYPE_CHART);

// ============================================
// FUNCIONES DE ANÁLISIS
// ============================================

/**
 * Estima el rol de un Pokémon basado en sus stats
 */
function estimateRole(pokemon: Pokemon): string {
  const ivs = pokemon.ivs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
  const evs = pokemon.evs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };

  const atkTotal = (ivs.attack || 0) + (evs.attack || 0) / 4;
  const spAtkTotal = (ivs.spAttack || 0) + (evs.spAttack || 0) / 4;
  const defTotal = (ivs.defense || 0) + (evs.defense || 0) / 4;
  const spDefTotal = (ivs.spDefense || 0) + (evs.spDefense || 0) / 4;
  const speedTotal = (ivs.speed || 0) + (evs.speed || 0) / 4;
  const hpTotal = (ivs.hp || 0) + (evs.hp || 0) / 4;

  const offensiveScore = Math.max(atkTotal, spAtkTotal);
  const defensiveScore = (defTotal + spDefTotal + hpTotal) / 3;

  if (speedTotal > 25 && offensiveScore > 25) return 'Sweeper';
  if (defensiveScore > 30 && hpTotal > 25) return 'Tank';
  if (offensiveScore > 28 && speedTotal < 20) return 'Wallbreaker';
  if (defTotal > 25 || spDefTotal > 25) return 'Wall';
  if (speedTotal > 20) return 'Pivot';
  return 'Utility';
}

/**
 * Calcula la cobertura de tipos del equipo
 */
function calculateTypeCoverage(teamTypes: string[][]): TypeCoverage {
  const offensive = new Set<string>();
  const defensive = new Set<string>();
  const weaknessCount: Record<string, number> = {};

  for (const types of teamTypes) {
    for (const type of types) {
      const typeData = TYPE_CHART[type.toLowerCase()];
      if (!typeData) continue;

      // Tipos que resiste este Pokémon
      typeData.resistsTo.forEach(t => defensive.add(t));
      typeData.immuneTo.forEach(t => defensive.add(t));

      // Debilidades
      typeData.weakTo.forEach(t => {
        weaknessCount[t] = (weaknessCount[t] || 0) + 1;
      });
    }
  }

  // Calcular cobertura ofensiva (tipos contra los que somos super efectivos)
  for (const type of ALL_TYPES) {
    const typeData = TYPE_CHART[type];
    if (typeData) {
      for (const memberTypes of teamTypes) {
        for (const memberType of memberTypes) {
          if (typeData.weakTo.includes(memberType.toLowerCase())) {
            offensive.add(type);
          }
        }
      }
    }
  }

  // Debilidades compartidas (más de 2 Pokémon débiles al mismo tipo)
  const sharedWeaknesses = Object.entries(weaknessCount)
    .filter(([, count]) => count >= 2)
    .map(([type]) => type);

  return {
    offensive: Array.from(offensive),
    defensive: Array.from(defensive),
    weaknesses: sharedWeaknesses,
  };
}

/**
 * Calcula la distribución de roles del equipo
 */
function calculateRoleDistribution(roles: string[]): TeamRole {
  return {
    sweepers: roles.filter(r => r === 'Sweeper').length,
    tanks: roles.filter(r => r === 'Tank' || r === 'Wall').length,
    wallBreakers: roles.filter(r => r === 'Wallbreaker').length,
    supports: roles.filter(r => r === 'Utility').length,
    pivots: roles.filter(r => r === 'Pivot').length,
  };
}

/**
 * Calcula métricas de sinergia del equipo
 */
function calculateSynergyMetrics(
  coverage: TypeCoverage,
  roles: TeamRole,
  teamSize: number
): TeamScore['synergyMetrics'] {
  // Balance de tipos (menos debilidades compartidas = mejor)
  const typeBalance = Math.max(0, 100 - (coverage.weaknesses.length * 15));

  // Cobertura ofensiva (más tipos cubiertos = mejor)
  const offensiveCoverage = Math.min(100, (coverage.offensive.length / ALL_TYPES.length) * 120);

  // Cobertura defensiva
  const defensiveCoverage = Math.min(100, (coverage.defensive.length / ALL_TYPES.length) * 100);

  // Balance de roles (ideal: mix de ofensivo y defensivo)
  const hasOffense = roles.sweepers + roles.wallBreakers > 0;
  const hasDefense = roles.tanks > 0;
  const hasSupport = roles.supports + roles.pivots > 0;
  const roleBalance = (hasOffense ? 35 : 0) + (hasDefense ? 35 : 0) + (hasSupport ? 30 : 0);

  // Sinergia general
  const overallSynergy = Math.round(
    (typeBalance * 0.25) +
    (offensiveCoverage * 0.25) +
    (defensiveCoverage * 0.25) +
    (roleBalance * 0.25)
  );

  return {
    typeBalance: Math.round(typeBalance),
    offensiveCoverage: Math.round(offensiveCoverage),
    defensiveCoverage: Math.round(defensiveCoverage),
    roleBalance: Math.round(roleBalance),
    overallSynergy,
  };
}

/**
 * Calcula el puntaje total del equipo
 */
function calculateTeamScore(
  members: TeamMemberAnalysis[],
  synergy: TeamScore['synergyMetrics'],
  shinyCount: number
): { total: Decimal128; breakdown: TeamScore['scoreBreakdown'] } {
  const rawPower = members.reduce((sum, m) => sum + m.powerContribution, 0);
  const synergyBonus = synergy.overallSynergy * 50;
  const coverageBonus = ((synergy.offensiveCoverage + synergy.defensiveCoverage) / 2) * 30;
  const balanceBonus = synergy.roleBalance * 20;
  const ivQuality = (members.reduce((sum, m) => sum + m.ivTotal, 0) / members.length) * 10;
  const evTraining = (members.reduce((sum, m) => sum + m.evTotal, 0) / members.length) * 5;
  const shinyBonusValue = shinyCount * 500;

  const total = rawPower + synergyBonus + coverageBonus + balanceBonus + ivQuality + evTraining + shinyBonusValue;

  return {
    total: Decimal128.fromString(total.toFixed(4)),
    breakdown: {
      rawPower: Math.round(rawPower),
      synergyBonus: Math.round(synergyBonus),
      coverageBonus: Math.round(coverageBonus),
      balanceBonus: Math.round(balanceBonus),
      ivQuality: Math.round(ivQuality),
      evTraining: Math.round(evTraining),
      shinyBonus: shinyBonusValue,
    },
  };
}

/**
 * Analiza un Pokémon individual para el equipo
 */
function analyzeMember(pokemon: Pokemon, slot: number): TeamMemberAnalysis {
  const ivs = pokemon.ivs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
  const evs = pokemon.evs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };

  const ivTotal = (ivs.hp || 0) + (ivs.attack || 0) + (ivs.defense || 0) +
                  (ivs.spAttack || 0) + (ivs.spDefense || 0) + (ivs.speed || 0);
  const evTotal = (evs.hp || 0) + (evs.attack || 0) + (evs.defense || 0) +
                  (evs.spAttack || 0) + (evs.spDefense || 0) + (evs.speed || 0);

  const powerContribution = (pokemon.level * 100) + (ivTotal * 30) + (evTotal * 10);

  return {
    slot,
    level: pokemon.level,
    ivTotal,
    evTotal,
    nature: pokemon.nature || 'Unknown',
    shiny: pokemon.shiny || false,
    estimatedRole: estimateRole(pokemon),
    powerContribution,
  };
}

// ============================================
// INTEGRACIÓN CON GROK AI
// ============================================

async function getTeamGrokAnalysis(topTeams: TeamScore[]): Promise<string> {
  const groqApiKey = env.GROQ_API_KEY;

  if (!groqApiKey) {
    return 'Análisis de IA no disponible en este momento.';
  }

  try {
    const prompt = `Eres el ANALISTA ESTRATÉGICO LEGENDARIO del servidor Cobblemon Los Pitufos. Tu trabajo es analizar los MEJORES EQUIPOS del servidor y determinar cuál tiene la mejor composición, sinergia y potencial competitivo.

🏆 TOP 10 EQUIPOS DEL SERVIDOR:
${topTeams.slice(0, 10).map((t, i) => `
🎯 #${i + 1}: EQUIPO DE "${t.ownerUsername}"
   └─ Puntaje Total: ${t.totalScoreDisplay.toLocaleString()} pts
   └─ Tamaño del Equipo: ${t.teamSize} Pokémon
   └─ Nivel Promedio: ${t.teamAnalysis.avgLevel}
   └─ IVs Promedio: ${t.teamAnalysis.avgIvs}/186
   └─ EVs Promedio: ${t.teamAnalysis.avgEvs}/510
   └─ Shinies: ${t.teamAnalysis.shinyCount} ✨
   
   📊 MÉTRICAS DE SINERGIA:
   • Balance de Tipos: ${t.synergyMetrics.typeBalance}/100
   • Cobertura Ofensiva: ${t.synergyMetrics.offensiveCoverage}/100
   • Cobertura Defensiva: ${t.synergyMetrics.defensiveCoverage}/100
   • Balance de Roles: ${t.synergyMetrics.roleBalance}/100
   • SINERGIA TOTAL: ${t.synergyMetrics.overallSynergy}/100
   
   🎭 COMPOSICIÓN DE ROLES:
   • Sweepers: ${t.teamAnalysis.roleDistribution.sweepers}
   • Tanks/Walls: ${t.teamAnalysis.roleDistribution.tanks}
   • Wallbreakers: ${t.teamAnalysis.roleDistribution.wallBreakers}
   • Supports: ${t.teamAnalysis.roleDistribution.supports}
   • Pivots: ${t.teamAnalysis.roleDistribution.pivots}
   
   ⚔️ COBERTURA DE TIPOS:
   • Debilidades Compartidas: ${t.teamAnalysis.typeCoverage.weaknesses.join(', ') || 'Ninguna crítica'}
   
   💰 DESGLOSE DE PUNTAJE:
   • Poder Bruto: ${t.scoreBreakdown.rawPower}
   • Bonus Sinergia: +${t.scoreBreakdown.synergyBonus}
   • Bonus Cobertura: +${t.scoreBreakdown.coverageBonus}
   • Bonus Balance: +${t.scoreBreakdown.balanceBonus}
`).join('\n')}

📋 TU ANÁLISIS DEBE INCLUIR:

1. 🏆 **EL MEJOR EQUIPO**: ¿Cuál es el equipo mejor construido y por qué? Analiza su sinergia, roles y cobertura.

2. 🧠 **ANÁLISIS ESTRATÉGICO**: 
   - ¿Qué equipos tienen la mejor planificación?
   - ¿Quién tiene la mejor cobertura de tipos?
   - ¿Qué equipos tienen debilidades explotables?

3. ⚔️ **MATCHUPS HIPOTÉTICOS**: Si estos equipos se enfrentaran, ¿quién tendría ventaja sobre quién?

4. 🎯 **EQUIPOS SORPRESA**: ¿Hay algún equipo subestimado con potencial oculto?

5. 📈 **CONSEJOS DE MEJORA**: ¿Qué deberían mejorar los entrenadores en sus equipos?

6. 🔥 **PREDICCIÓN**: Si hubiera un torneo de equipos completos, ¿quién ganaría y por qué?

REGLAS:
- NO menciones nombres de especies (son secretos)
- Sé DRAMÁTICO y EMOCIONANTE
- Usa emojis estratégicamente
- Mínimo 500 palabras
- Español latino, tono épico
- Analiza la SINERGIA y ESTRATEGIA, no solo el poder bruto`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Eres el analista estratégico más respetado del mundo Pokémon competitivo. Analizas equipos con la precisión de un maestro de ajedrez y la pasión de un comentarista deportivo. Siempre respondes en español latino con energía y conocimiento profundo de estrategia competitiva.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2000,
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      console.error('[TEAM GROK] Error en API:', response.status);
      return 'Análisis de IA temporalmente no disponible.';
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content || 'Análisis no disponible.';
  } catch (error) {
    console.error('[TEAM GROK] Error:', error);
    return 'Error al obtener análisis de IA.';
  }
}

// ============================================
// SERVICIO PRINCIPAL
// ============================================

export class TeamRankingService {
  constructor(
    private usersCollection: Collection<User>,
    private levelCapsCollection: Collection<LevelCapsDocument>
  ) {}

  private async getCurrentLevelCap(): Promise<number> {
    try {
      const config = await this.levelCapsCollection.findOne({});
      if (!config) return 100;

      let ownershipCap = 100;
      const now = new Date();

      const timeRules = (config.timeBasedRules || []).filter(
        r => r.active && new Date(r.startDate) <= now && (!r.endDate || new Date(r.endDate) >= now)
      );

      for (const rule of timeRules) {
        if (rule.targetCap === 'ownership' || rule.targetCap === 'both') {
          const daysPassed = Math.floor((now.getTime() - new Date(rule.startDate).getTime()) / (1000 * 60 * 60 * 24));
          let cap = rule.startCap || 100;

          if (rule.progression?.type === 'daily') {
            cap += daysPassed * (rule.progression.dailyIncrease || 0);
          } else if (rule.progression?.type === 'interval') {
            const intervals = Math.floor(daysPassed / (rule.progression.intervalDays || 1));
            cap += intervals * (rule.progression.intervalIncrease || 0);
          }

          if (rule.maxCap) cap = Math.min(cap, rule.maxCap);
          ownershipCap = Math.min(ownershipCap, cap);
        }
      }

      const staticRules = (config.staticRules || []).filter(r => r.active);
      for (const rule of staticRules) {
        if (rule.ownershipCap !== null && rule.ownershipCap !== undefined) {
          ownershipCap = Math.min(ownershipCap, rule.ownershipCap);
        }
      }

      return ownershipCap;
    } catch {
      return 100;
    }
  }

  async getTeamRanking(forceRefresh: boolean = false): Promise<TeamRankingResponse> {
    const now = new Date();

    if (!forceRefresh && cachedTeamRanking && lastTeamCalculation) {
      const timeSince = now.getTime() - lastTeamCalculation.getTime();
      if (timeSince < CACHE_DURATION_MS) {
        return cachedTeamRanking;
      }
    }

    console.log('[TEAM RANKING] Calculando nuevo ranking de equipos...');

    const currentLevelCap = await this.getCurrentLevelCap();
    const MINIMUM_TEAM_SIZE = 3;

    const users = await this.usersCollection
      .find({
        verified: true,
        minecraftUsername: { $exists: true, $ne: '' },
      })
      .toArray();

    const teamScores: TeamScore[] = [];
    let totalPlayersChecked = 0;

    for (const user of users) {
      totalPlayersChecked++;

      const party = (user.pokemonParty || []).filter(
        (p): p is Pokemon => p !== null && typeof p.level === 'number' && p.level > 0 && p.level <= currentLevelCap
      );

      if (party.length < MINIMUM_TEAM_SIZE) continue;

      // Analizar cada miembro del equipo
      const members: TeamMemberAnalysis[] = party.map((p, i) => analyzeMember(p, i + 1));
      const roles = members.map(m => m.estimatedRole);

      // Extraer tipos (simulados basados en species si disponible)
      const teamTypes: string[][] = party.map(p => {
        // En un caso real, buscaríamos los tipos por especie
        // Por ahora usamos tipos genéricos basados en el speciesId
        const typeIndex = (p.speciesId || 1) % ALL_TYPES.length;
        const secondTypeIndex = ((p.speciesId || 1) * 7) % ALL_TYPES.length;
        return typeIndex !== secondTypeIndex 
          ? [ALL_TYPES[typeIndex]!, ALL_TYPES[secondTypeIndex]!]
          : [ALL_TYPES[typeIndex]!];
      });

      const coverage = calculateTypeCoverage(teamTypes);
      const roleDistribution = calculateRoleDistribution(roles);
      const synergyMetrics = calculateSynergyMetrics(coverage, roleDistribution, party.length);

      const avgLevel = Math.round(members.reduce((s, m) => s + m.level, 0) / members.length);
      const avgIvs = Math.round(members.reduce((s, m) => s + m.ivTotal, 0) / members.length);
      const avgEvs = Math.round(members.reduce((s, m) => s + m.evTotal, 0) / members.length);
      const shinyCount = members.filter(m => m.shiny).length;

      const { total, breakdown } = calculateTeamScore(members, synergyMetrics, shinyCount);

      teamScores.push({
        _ownerUuid: user.minecraftUuid || user.discordId || 'unknown',
        _teamComposition: party.map(p => p.species),
        ownerUsername: user.minecraftUsername || user.nickname || 'Desconocido',
        teamSize: party.length,
        totalScore: total,
        totalScoreDisplay: Math.round(parseFloat(total.toString())),
        scoreBreakdown: breakdown,
        teamAnalysis: {
          members,
          typeCoverage: coverage,
          roleDistribution,
          avgLevel,
          avgIvs,
          avgEvs,
          shinyCount,
        },
        synergyMetrics,
        rank: 0,
        calculatedAt: now,
      });
    }

    // Ordenar por puntaje total
    teamScores.sort((a, b) => {
      const aScore = parseFloat(a.totalScore.toString());
      const bScore = parseFloat(b.totalScore.toString());
      return bScore - aScore;
    });

    // Asignar ranks y tomar top 20
    const topTeams = teamScores.slice(0, 20).map((t, i) => ({ ...t, rank: i + 1 }));

    // Obtener análisis de Grok
    const grokAnalysis = await getTeamGrokAnalysis(topTeams);

    const ranking: TeamRankingResponse = {
      rankings: topTeams,
      totalTeamsAnalyzed: teamScores.length,
      totalPlayersChecked,
      lastCalculated: now,
      nextUpdate: new Date(now.getTime() + CACHE_DURATION_MS),
      grokMasterAnalysis: grokAnalysis,
      currentLevelCap,
      minimumTeamSize: MINIMUM_TEAM_SIZE,
    };

    cachedTeamRanking = ranking;
    lastTeamCalculation = now;

    console.log(`[TEAM RANKING] ${teamScores.length} equipos analizados de ${totalPlayersChecked} jugadores`);

    return ranking;
  }

  getTimeUntilNextUpdate(): { minutes: number; seconds: number } {
    if (!lastTeamCalculation) return { minutes: 0, seconds: 0 };

    const now = new Date();
    const nextUpdate = new Date(lastTeamCalculation.getTime() + CACHE_DURATION_MS);
    const remaining = Math.max(0, nextUpdate.getTime() - now.getTime());

    return {
      minutes: Math.floor(remaining / 60000),
      seconds: Math.floor((remaining % 60000) / 1000),
    };
  }
}
