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
 * Obtiene análisis de Grok AI sobre el ranking
 */
async function getGrokAnalysis(topPokemon: PokemonPowerScore[]): Promise<string> {
  const groqApiKey = env.GROQ_API_KEY;

  if (!groqApiKey) {
    return 'Análisis de IA no disponible en este momento.';
  }

  try {
    const prompt = `Eres un analista experto de Pokémon competitivo. Analiza este ranking de los Pokémon más fuertes del servidor Cobblemon Los Pitufos.

DATOS DEL RANKING (Top 10 - Un Pokémon por jugador):
${topPokemon.slice(0, 10).map((p, i) => `
#${i + 1}: ${p.ownerUsername}
- Puntaje: ${p.powerScoreDisplay.toLocaleString()}
- Nivel: ${p.realStats.level}
- IVs: ${p.realStats.ivs.total}/186 (HP:${p.realStats.ivs.hp} ATK:${p.realStats.ivs.attack} DEF:${p.realStats.ivs.defense} SPA:${p.realStats.ivs.spAttack} SPD:${p.realStats.ivs.spDefense} SPE:${p.realStats.ivs.speed})
- EVs: ${p.realStats.evs.total}/510
- Naturaleza: ${p.realStats.nature}
- Shiny: ${p.realStats.shiny ? 'Sí' : 'No'}
`).join('\n')}

INSTRUCCIONES:
1. Analiza quién tiene el Pokémon mejor optimizado
2. Comenta sobre la distribución de IVs y EVs
3. Evalúa las naturalezas elegidas
4. Máximo 150 palabras, en español
5. NO menciones especies de Pokémon (son secretas)
6. Tono profesional pero accesible`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2-instruct-0905',
        messages: [
          { role: 'system', content: 'Eres un analista experto de Pokémon competitivo. Responde siempre en español.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 400,
        temperature: 0.7,
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
  constructor(private usersCollection: Collection<User>) {}

  /**
   * Calcula el ranking de Pokémon más fuertes
   * UN POKÉMON POR JUGADOR (el más fuerte de cada uno)
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

    // Obtener todos los usuarios verificados
    const users = await this.usersCollection
      .find({
        verified: true,
        minecraftUsername: { $exists: true, $ne: '' },
      })
      .toArray();

    let totalPokemonAnalyzed = 0;

    // Para cada jugador, encontrar su Pokémon más fuerte
    const strongestPerPlayer: PokemonPowerScore[] = [];

    for (const user of users) {
      const allUserPokemon = [
        ...(user.pokemonParty || []),
        ...(user.pcStorage || []).flatMap((box) => box.pokemon || []),
      ].filter((p) => p && p.level && p.ivs && p.evs);

      totalPokemonAnalyzed += allUserPokemon.length;

      if (allUserPokemon.length === 0) continue;

      // Calcular poder de cada Pokémon del usuario
      let strongestPokemon: Pokemon | null = null;
      let highestPower = 0;

      for (const pokemon of allUserPokemon) {
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
          ownerTotalPokemon: allUserPokemon.length,
          powerScore,
          powerScoreDisplay: Math.round(parseFloat(powerScore.toString())),
          realStats: generateRealStats(strongestPokemon),
          rank: 0,
          calculatedAt: now,
        });
      }
    }

    console.log(`[STRONGEST POKEMON] ${strongestPerPlayer.length} jugadores con Pokémon, ${totalPokemonAnalyzed} total analizados`);

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
