/**
 * Servicio de Ranking de Pokémon Más Fuertes
 * Cobblemon Los Pitufos - Backend API
 * 
 * Calcula el poder de cada Pokémon usando Decimal128 para máxima precisión
 * y utiliza Grok AI para análisis meticuloso del ranking.
 * 
 * CAMBIOS:
 * - Stats REALES (no aproximaciones)
 * - Un Pokémon por jugador (el más fuerte)
 * - Silueta negra en lugar de sprite aleatorio
 */

import { Collection, Decimal128 } from 'mongodb';
import { User, Pokemon } from '../../shared/types/user.types.js';
import { LevelCapsDocument } from '../../shared/types/level-caps.types.js';
import { env } from '../../config/env.js';

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface PokemonPowerScore {
  // Identificación (privada - no se expone el nombre/especie)
  _pokemonUuid: string;
  _ownerUuid: string;
  _species: string;
  _speciesId: number;

  // Datos públicos
  ownerUsername: string;
  ownerTotalPokemon: number;

  // Puntaje calculado con Decimal128
  powerScore: Decimal128;
  powerScoreDisplay: number;

  // Estadísticas REALES (ya no aproximaciones)
  realStats: {
    level: number;
    ivs: {
      hp: number;
      attack: number;
      defense: number;
      spAttack: number;
      spDefense: number;
      speed: number;
      total: number;
    };
    evs: {
      hp: number;
      attack: number;
      defense: number;
      spAttack: number;
      spDefense: number;
      speed: number;
      total: number;
    };
    nature: string;
    shiny: boolean;
    friendship: number;
  };

  // Análisis de Grok
  grokAnalysis?: string;

  // Metadata
  rank: number;
  calculatedAt: Date;
}

export interface StrongestPokemonRanking {
  rankings: PokemonPowerScore[];
  totalAnalyzed: number;
  totalPlayers: number;
  lastCalculated: Date;
  nextUpdate: Date;
  grokMasterAnalysis?: string;
  calculationPrecision: string;
  currentLevelCap: number; // Level cap actual usado para filtrar
}

// Cache del ranking
let cachedRanking: StrongestPokemonRanking | null = null;
let lastCalculation: Date | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutos

// ============================================
// FUNCIONES DE CÁLCULO CON DECIMAL128
// ============================================

/**
 * Calcula el poder total de un Pokémon usando Decimal128 para precisión máxima
 */
function calculatePokemonPower(pokemon: Pokemon): Decimal128 {
  const ivs = pokemon.ivs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
  const evs = pokemon.evs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };

  const ivTotal =
    (ivs.hp || 0) + (ivs.attack || 0) + (ivs.defense || 0) +
    (ivs.spAttack || 0) + (ivs.spDefense || 0) + (ivs.speed || 0);

  const evTotal =
    (evs.hp || 0) + (evs.attack || 0) + (evs.defense || 0) +
    (evs.spAttack || 0) + (evs.spDefense || 0) + (evs.speed || 0);

  const natureMultiplier = getNatureMultiplier(pokemon.nature);
  const shinyBonus = pokemon.shiny ? 1.05 : 1.0;
  const friendshipBonus = (pokemon.friendship || 0) >= 255 ? 1.02 : 1.0;

  // Fórmula de poder
  const basePower =
    (pokemon.level * 100) +
    (ivTotal * 50) +
    (evTotal * 10) +
    (natureMultiplier * 500);

  const finalPower = basePower * shinyBonus * friendshipBonus;

  // Decimales de precisión
  const precisionDecimals = calculatePrecisionDecimals(pokemon);

  return Decimal128.fromString((finalPower + precisionDecimals).toFixed(18));
}

/**
 * Calcula decimales de precisión basados en distribución de stats
 */
function calculatePrecisionDecimals(pokemon: Pokemon): number {
  const ivs = pokemon.ivs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
  const evs = pokemon.evs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };

  const ivPrecision =
    ((ivs.hp || 0) / 31) * 0.1 +
    ((ivs.attack || 0) / 31) * 0.01 +
    ((ivs.defense || 0) / 31) * 0.001 +
    ((ivs.spAttack || 0) / 31) * 0.0001 +
    ((ivs.spDefense || 0) / 31) * 0.00001 +
    ((ivs.speed || 0) / 31) * 0.000001;

  const evPrecision =
    ((evs.hp || 0) / 252) * 0.0000001 +
    ((evs.attack || 0) / 252) * 0.00000001 +
    ((evs.defense || 0) / 252) * 0.000000001 +
    ((evs.spAttack || 0) / 252) * 0.0000000001 +
    ((evs.spDefense || 0) / 252) * 0.00000000001 +
    ((evs.speed || 0) / 252) * 0.000000000001;

  return ivPrecision + evPrecision;
}

/**
 * Obtiene multiplicador de naturaleza
 */
function getNatureMultiplier(nature: string): number {
  const beneficialNatures: Record<string, number> = {
    adamant: 1.1, jolly: 1.1, modest: 1.1, timid: 1.1,
    brave: 1.08, quiet: 1.08, impish: 1.05, careful: 1.05,
    bold: 1.05, calm: 1.05, relaxed: 1.03, sassy: 1.03,
  };
  return beneficialNatures[(nature || '').toLowerCase()] || 1.0;
}

/**
 * Genera estadísticas REALES del Pokémon
 */
function generateRealStats(pokemon: Pokemon): PokemonPowerScore['realStats'] {
  const ivs = pokemon.ivs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
  const evs = pokemon.evs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };

  return {
    level: pokemon.level,
    ivs: {
      hp: ivs.hp || 0,
      attack: ivs.attack || 0,
      defense: ivs.defense || 0,
      spAttack: ivs.spAttack || 0,
      spDefense: ivs.spDefense || 0,
      speed: ivs.speed || 0,
      total: (ivs.hp || 0) + (ivs.attack || 0) + (ivs.defense || 0) +
             (ivs.spAttack || 0) + (ivs.spDefense || 0) + (ivs.speed || 0),
    },
    evs: {
      hp: evs.hp || 0,
      attack: evs.attack || 0,
      defense: evs.defense || 0,
      spAttack: evs.spAttack || 0,
      spDefense: evs.spDefense || 0,
      speed: evs.speed || 0,
      total: (evs.hp || 0) + (evs.attack || 0) + (evs.defense || 0) +
             (evs.spAttack || 0) + (evs.spDefense || 0) + (evs.speed || 0),
    },
    nature: pokemon.nature || 'Unknown',
    shiny: pokemon.shiny || false,
    friendship: pokemon.friendship || 0,
  };
}

// ============================================
// INTEGRACIÓN CON GROK AI
// ============================================

/**
 * Obtiene análisis épico de Grok AI sobre el ranking - estilo Battle Royale
 */
async function getGrokAnalysis(topPokemon: PokemonPowerScore[]): Promise<string> {
  const groqApiKey = env.GROQ_API_KEY;

  if (!groqApiKey) {
    return 'Análisis de IA no disponible en este momento.';
  }

  try {
    const prompt = `Eres el COMENTARISTA LEGENDARIO del servidor Cobblemon Los Pitufos. Tu trabajo es analizar el ranking de los Pokémon más fuertes y predecir quién ganaría en un BATTLE ROYALE ÉPICO donde todos pelean contra todos hasta que solo quede uno.

🏆 DATOS DEL RANKING - TOP 10 CONTENDIENTES:
${topPokemon.slice(0, 10).map((p, i) => `
🥊 #${i + 1}: "${p.ownerUsername}"
   └─ Poder Total: ${p.powerScoreDisplay.toLocaleString()} pts
   └─ Nivel: ${p.realStats.level}
   └─ IVs Totales: ${p.realStats.ivs.total}/186
      • HP: ${p.realStats.ivs.hp}/31 | ATK: ${p.realStats.ivs.attack}/31 | DEF: ${p.realStats.ivs.defense}/31
      • SpA: ${p.realStats.ivs.spAttack}/31 | SpD: ${p.realStats.ivs.spDefense}/31 | SPE: ${p.realStats.ivs.speed}/31
   └─ EVs Entrenados: ${p.realStats.evs.total}/510
   └─ Naturaleza: ${p.realStats.nature}
   └─ ✨ Shiny: ${p.realStats.shiny ? '¡SÍ!' : 'No'}
   └─ Amistad: ${p.realStats.friendship}/255
`).join('\n')}

📊 TU ANÁLISIS DEBE INCLUIR:

1. 🏆 **EL CAMPEÓN PREDICHO**: ¿Quién ganaría el Battle Royale y por qué? Analiza sus stats, naturaleza, y potencial.

2. ⚔️ **MATCHUPS CLAVE**: ¿Qué enfrentamientos serían los más épicos? ¿Quién tiene ventaja sobre quién?

3. 🎯 **ANÁLISIS DE BUILDS**: 
   - ¿Quién tiene la mejor distribución de IVs?
   - ¿Quién ha entrenado mejor sus EVs?
   - ¿Las naturalezas elegidas son óptimas?

4. 🌟 **DARK HORSES**: ¿Hay algún contendiente subestimado que podría dar la sorpresa?

5. 💀 **PRIMERAS BAJAS**: ¿Quiénes caerían primero y por qué?

6. 🔥 **MOMENTO ÉPICO**: Describe cómo sería el enfrentamiento final entre los 2-3 últimos supervivientes.

7. 📈 **CONSEJOS**: ¿Qué deberían mejorar los entrenadores para subir en el ranking?

REGLAS:
- NO menciones nombres de especies de Pokémon (son secretos, usa "el Pokémon de [usuario]")
- Sé DRAMÁTICO y EMOCIONANTE como un comentarista de WWE
- Usa emojis para hacer el análisis más visual
- Mínimo 400 palabras, máximo 600
- Español latino, tono épico pero accesible
- Incluye predicciones porcentuales de victoria`;

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
            content: 'Eres el comentarista más épico y dramático del mundo Pokémon competitivo. Tu estilo es como un comentarista de WWE mezclado con un analista deportivo experto. Siempre respondes en español latino con mucha energía y emoción. Usas emojis estratégicamente para hacer el contenido más visual y emocionante.' 
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1500,
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GROK] Error en API:', response.status, errorText);
      return 'Análisis de IA temporalmente no disponible.';
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content || 'Análisis no disponible.';
  } catch (error) {
    console.error('[GROK] Error obteniendo análisis:', error);
    return 'Error al obtener análisis de IA.';
  }
}

// ============================================
// SERVICIO PRINCIPAL
// ============================================

export class StrongestPokemonService {
  constructor(
    private usersCollection: Collection<User>,
    private levelCapsCollection: Collection<LevelCapsDocument>
  ) {}

  /**
   * Obtiene el level cap de ownership actual del servidor
   */
  private async getCurrentLevelCap(): Promise<number> {
    try {
      const config = await this.levelCapsCollection.findOne({});
      if (!config) return 100; // Default si no hay config

      let ownershipCap = 100;

      // Evaluar reglas temporales activas
      const now = new Date();
      const timeRules = (config.timeBasedRules || []).filter(
        r => r.active && new Date(r.startDate) <= now && (!r.endDate || new Date(r.endDate) >= now)
      );

      for (const rule of timeRules) {
        if (rule.targetCap === 'ownership' || rule.targetCap === 'both') {
          const currentCap = this.calculateTimeBasedCap(rule);
          ownershipCap = Math.min(ownershipCap, currentCap);
        }
      }

      // Evaluar reglas estáticas globales
      const staticRules = (config.staticRules || []).filter(r => r.active);
      for (const rule of staticRules) {
        if (rule.ownershipCap !== null && rule.ownershipCap !== undefined) {
          ownershipCap = Math.min(ownershipCap, rule.ownershipCap);
        }
      }

      return ownershipCap;
    } catch (error) {
      console.error('[STRONGEST POKEMON] Error obteniendo level cap:', error);
      return 100;
    }
  }

  /**
   * Calcula el cap basado en reglas temporales
   */
  private calculateTimeBasedCap(rule: any): number {
    const now = new Date();
    const daysPassed = Math.floor((now.getTime() - new Date(rule.startDate).getTime()) / (1000 * 60 * 60 * 24));

    let cap = rule.startCap || 100;

    if (rule.progression?.type === 'daily') {
      cap += daysPassed * (rule.progression.dailyIncrease || 0);
    } else if (rule.progression?.type === 'interval') {
      const intervals = Math.floor(daysPassed / (rule.progression.intervalDays || 1));
      cap += intervals * (rule.progression.intervalIncrease || 0);
    } else if (rule.progression?.type === 'schedule') {
      const applicableSchedules = (rule.progression.schedule || [])
        .filter((s: any) => new Date(s.date) <= now)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (applicableSchedules.length > 0 && applicableSchedules[0]) {
        cap = applicableSchedules[0].setCap;
      }
    }

    if (rule.maxCap) {
      cap = Math.min(cap, rule.maxCap);
    }

    return cap;
  }

  /**
   * Calcula el ranking de Pokémon más fuertes
   * UN POKÉMON POR JUGADOR (el más fuerte de cada uno)
   * SOLO POKÉMON POR DEBAJO O IGUAL AL LEVEL CAP ACTUAL
   */
  async getStrongestPokemonRanking(forceRefresh: boolean = false): Promise<StrongestPokemonRanking> {
    const now = new Date();

    // Verificar cache
    if (!forceRefresh && cachedRanking && lastCalculation) {
      const timeSinceLastCalc = now.getTime() - lastCalculation.getTime();
      if (timeSinceLastCalc < CACHE_DURATION_MS) {
        return cachedRanking;
      }
    }

    console.log('[STRONGEST POKEMON] Calculando nuevo ranking...');

    // Obtener el level cap actual
    const currentLevelCap = await this.getCurrentLevelCap();
    console.log(`[STRONGEST POKEMON] Level cap actual: ${currentLevelCap}`);

    // Obtener todos los usuarios verificados
    const users = await this.usersCollection
      .find({
        verified: true,
        minecraftUsername: { $exists: true, $ne: '' },
      })
      .toArray();

    let totalPokemonAnalyzed = 0;
    let totalPokemonFiltered = 0;

    // Para cada jugador, encontrar su Pokémon más fuerte (dentro del level cap)
    const strongestPerPlayer: PokemonPowerScore[] = [];

    for (const user of users) {
      // Obtener todos los Pokémon del usuario (party + PC)
      const rawPokemon = [
        ...(user.pokemonParty || []),
        ...(user.pcStorage || []).flatMap((box) => box.pokemon || []),
      ];
      
      // Filtrar Pokémon válidos - solo requerir que exista y tenga nivel
      const validPokemon = rawPokemon.filter((p) => p && typeof p.level === 'number' && p.level > 0);
      totalPokemonAnalyzed += validPokemon.length;

      // FILTRAR POR LEVEL CAP - Solo Pokémon con nivel <= level cap
      const eligiblePokemon = validPokemon.filter((p): p is Pokemon => p !== null && p.level <= currentLevelCap);
      totalPokemonFiltered += (validPokemon.length - eligiblePokemon.length);

      if (eligiblePokemon.length === 0) continue;

      // Calcular poder de cada Pokémon elegible del usuario
      let strongestPokemon: Pokemon | null = null;
      let highestPower = 0;

      for (const pokemon of eligiblePokemon) {
        if (!pokemon) continue;
        const power = parseFloat(calculatePokemonPower(pokemon).toString());
        if (power > highestPower) {
          highestPower = power;
          strongestPokemon = pokemon;
        }
      }

      if (strongestPokemon) {
        const powerScore = calculatePokemonPower(strongestPokemon);

        strongestPerPlayer.push({
          _pokemonUuid: strongestPokemon.uuid,
          _ownerUuid: user.minecraftUuid || user.discordId || 'unknown',
          _species: strongestPokemon.species,
          _speciesId: strongestPokemon.speciesId,
          ownerUsername: user.minecraftUsername || user.nickname || 'Desconocido',
          ownerTotalPokemon: eligiblePokemon.length,
          powerScore,
          powerScoreDisplay: Math.round(parseFloat(powerScore.toString())),
          realStats: generateRealStats(strongestPokemon),
          rank: 0,
          calculatedAt: now,
        });
      }
    }

    console.log(`[STRONGEST POKEMON] ${strongestPerPlayer.length} jugadores con Pokémon elegibles`);
    console.log(`[STRONGEST POKEMON] ${totalPokemonAnalyzed} total analizados, ${totalPokemonFiltered} filtrados por level cap`);

    // Ordenar por poder (mayor a menor)
    strongestPerPlayer.sort((a, b) => {
      const aScore = parseFloat(a.powerScore.toString());
      const bScore = parseFloat(b.powerScore.toString());
      return bScore - aScore;
    });

    // Asignar ranks y tomar top 20
    const topPokemon = strongestPerPlayer.slice(0, 20).map((p, index) => ({
      ...p,
      rank: index + 1,
    }));

    // Obtener análisis de Grok
    const grokAnalysis = await getGrokAnalysis(topPokemon);

    // Crear resultado
    const ranking: StrongestPokemonRanking = {
      rankings: topPokemon,
      totalAnalyzed: totalPokemonAnalyzed,
      totalPlayers: strongestPerPlayer.length,
      lastCalculated: now,
      nextUpdate: new Date(now.getTime() + CACHE_DURATION_MS),
      grokMasterAnalysis: grokAnalysis,
      calculationPrecision: 'Decimal128 (18 decimales de precisión)',
      currentLevelCap,
    };

    // Guardar en cache
    cachedRanking = ranking;
    lastCalculation = now;

    console.log('[STRONGEST POKEMON] Ranking calculado exitosamente');

    return ranking;
  }

  /**
   * Obtiene el tiempo restante hasta la próxima actualización
   */
  getTimeUntilNextUpdate(): { minutes: number; seconds: number } {
    if (!lastCalculation) {
      return { minutes: 0, seconds: 0 };
    }

    const now = new Date();
    const nextUpdate = new Date(lastCalculation.getTime() + CACHE_DURATION_MS);
    const remaining = Math.max(0, nextUpdate.getTime() - now.getTime());

    return {
      minutes: Math.floor(remaining / 60000),
      seconds: Math.floor((remaining % 60000) / 1000),
    };
  }
}
