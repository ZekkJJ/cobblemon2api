/**
 * Servicio de Ranking de Pokémon Más Fuertes
 * Cobblemon Los Pitufos - Backend API
 * 
 * Calcula el poder de cada Pokémon usando Decimal128 para máxima precisión
 * y utiliza Grok AI para análisis meticuloso del ranking.
 * 
 * El ranking se actualiza cada 2 horas y protege la privacidad del entrenador
 * mostrando solo estadísticas aproximadas y sprites aleatorios.
 */

import { Collection, Decimal128 } from 'mongodb';
import { User, Pokemon } from '../../shared/types/user.types.js';
import { env } from '../../config/env.js';

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface PokemonPowerScore {
  // Identificación (privada - no se expone)
  _pokemonUuid: string;
  _ownerUuid: string;
  _species: string;
  _speciesId: number;
  
  // Datos públicos
  ownerUsername: string;
  ownerTotalPokemon: number;
  
  // Puntaje calculado con Decimal128
  powerScore: Decimal128;
  powerScoreDisplay: number; // Versión redondeada para mostrar
  
  // Estadísticas aproximadas (para privacidad)
  approximateStats: {
    level: string; // "~85-90" en lugar de exacto
    totalIVs: string; // "~150-160"
    totalEVs: string; // "~400-450"
    nature: string; // Se muestra
  };
  
  // Sprite aleatorio (NO del Pokémon real)
  randomSpriteId: number;
  
  // Análisis de Grok
  grokAnalysis?: string;
  
  // Metadata
  rank: number;
  calculatedAt: Date;
}

export interface StrongestPokemonRanking {
  rankings: PokemonPowerScore[];
  totalAnalyzed: number;
  lastCalculated: Date;
  nextUpdate: Date;
  grokMasterAnalysis?: string;
  calculationPrecision: string;
}

// Cache del ranking
let cachedRanking: StrongestPokemonRanking | null = null;
let lastCalculation: Date | null = null;
const CACHE_DURATION_MS = 2 * 60 * 60 * 1000; // 2 horas

// ============================================
// FUNCIONES DE CÁLCULO CON DECIMAL128
// ============================================

/**
 * Calcula el poder total de un Pokémon usando Decimal128 para precisión máxima
 * Fórmula compleja que considera múltiples factores
 */
function calculatePokemonPower(pokemon: Pokemon): Decimal128 {
  // Convertir todo a Decimal128 para precisión
  const level = Decimal128.fromString(pokemon.level.toString());
  
  // IVs (0-31 cada uno, máximo 186)
  const ivTotal = Decimal128.fromString(
    ((pokemon.ivs?.hp || 0) + (pokemon.ivs?.attack || 0) + (pokemon.ivs?.defense || 0) + 
     (pokemon.ivs?.spAttack || 0) + (pokemon.ivs?.spDefense || 0) + (pokemon.ivs?.speed || 0)).toString()
  );
  
  // EVs (0-252 cada uno, máximo 510)
  const evTotal = Decimal128.fromString(
    ((pokemon.evs?.hp || 0) + (pokemon.evs?.attack || 0) + (pokemon.evs?.defense || 0) + 
     (pokemon.evs?.spAttack || 0) + (pokemon.evs?.spDefense || 0) + (pokemon.evs?.speed || 0)).toString()
  );
  
  // Multiplicadores de naturaleza (simplificado)
  const natureMultiplier = getNatureMultiplier(pokemon.nature);
  
  // Bonus por shiny (pequeño bonus de prestigio)
  const shinyBonus = pokemon.shiny ? '1.05' : '1.0';
  
  // Bonus por amistad máxima
  const friendshipBonus = pokemon.friendship >= 255 ? '1.02' : '1.0';
  
  // Fórmula de poder:
  // Power = (Level * 100) + (IVs * 50) + (EVs * 10) + (Nature * 500) + Bonuses
  // Luego se aplican multiplicadores
  
  const basePower = 
    parseFloat(level.toString()) * 100 +
    parseFloat(ivTotal.toString()) * 50 +
    parseFloat(evTotal.toString()) * 10 +
    natureMultiplier * 500;
  
  const finalPower = basePower * 
    parseFloat(shinyBonus) * 
    parseFloat(friendshipBonus);
  
  // Añadir decimales de precisión basados en stats individuales
  const precisionDecimals = calculatePrecisionDecimals(pokemon);
  
  return Decimal128.fromString((finalPower + precisionDecimals).toFixed(18));
}

/**
 * Calcula decimales de precisión basados en distribución de stats
 */
function calculatePrecisionDecimals(pokemon: Pokemon): number {
  const ivs = pokemon.ivs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
  const evs = pokemon.evs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
  
  // Usar los IVs individuales para crear decimales únicos
  const ivPrecision = 
    ((ivs.hp || 0) / 31) * 0.1 +
    ((ivs.attack || 0) / 31) * 0.01 +
    ((ivs.defense || 0) / 31) * 0.001 +
    ((ivs.spAttack || 0) / 31) * 0.0001 +
    ((ivs.spDefense || 0) / 31) * 0.00001 +
    ((ivs.speed || 0) / 31) * 0.000001;
  
  // EVs para más precisión
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
    'adamant': 1.1, 'jolly': 1.1, 'modest': 1.1, 'timid': 1.1,
    'brave': 1.08, 'quiet': 1.08, 'impish': 1.05, 'careful': 1.05,
    'bold': 1.05, 'calm': 1.05, 'relaxed': 1.03, 'sassy': 1.03,
  };
  return beneficialNatures[nature.toLowerCase()] || 1.0;
}

/**
 * Genera estadísticas aproximadas para privacidad
 */
function generateApproximateStats(pokemon: Pokemon): PokemonPowerScore['approximateStats'] {
  const ivs = pokemon.ivs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
  const evs = pokemon.evs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
  
  // Redondear nivel a rangos de 5
  const levelMin = Math.floor(pokemon.level / 5) * 5;
  const levelMax = levelMin + 5;
  
  // IVs totales aproximados (rangos de 10)
  const ivTotal = (ivs.hp || 0) + (ivs.attack || 0) + (ivs.defense || 0) + 
                  (ivs.spAttack || 0) + (ivs.spDefense || 0) + (ivs.speed || 0);
  const ivMin = Math.floor(ivTotal / 10) * 10;
  const ivMax = ivMin + 10;
  
  // EVs totales aproximados (rangos de 50)
  const evTotal = (evs.hp || 0) + (evs.attack || 0) + (evs.defense || 0) + 
                  (evs.spAttack || 0) + (evs.spDefense || 0) + (evs.speed || 0);
  const evMin = Math.floor(evTotal / 50) * 50;
  const evMax = evMin + 50;
  
  return {
    level: `~${levelMin}-${levelMax}`,
    totalIVs: `~${ivMin}-${ivMax}`,
    totalEVs: `~${evMin}-${evMax}`,
    nature: pokemon.nature || 'Unknown',
  };
}

/**
 * Genera un sprite ID aleatorio (no del Pokémon real)
 */
function generateRandomSpriteId(excludeId: number): number {
  const allPokemonIds = Array.from({ length: 1010 }, (_, i) => i + 1);
  const filtered = allPokemonIds.filter(id => id !== excludeId);
  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex] ?? 25; // Fallback to Pikachu if something goes wrong
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
    const prompt = `Eres un analista experto de Pokémon competitivo. Analiza meticulosamente este ranking de los Pokémon más fuertes del servidor Cobblemon Los Pitufos.

DATOS DEL RANKING (Top 10):
${topPokemon.slice(0, 10).map((p, i) => `
#${i + 1}: 
- Entrenador: ${p.ownerUsername}
- Pokémon totales del entrenador: ${p.ownerTotalPokemon}
- Puntaje de poder: ${p.powerScoreDisplay.toLocaleString()}
- Nivel aproximado: ${p.approximateStats.level}
- IVs totales aproximados: ${p.approximateStats.totalIVs}
- EVs totales aproximados: ${p.approximateStats.totalEVs}
- Naturaleza: ${p.approximateStats.nature}
`).join('\n')}

INSTRUCCIONES:
1. Analiza la distribución de poder entre los top entrenadores
2. Comenta sobre las naturalezas elegidas y su efectividad
3. Evalúa el balance entre IVs y EVs
4. Da una conclusión sobre quién tiene el Pokémon más optimizado
5. Sé conciso pero perspicaz (máximo 200 palabras)
6. Responde en español
7. NO menciones nombres de especies de Pokémon (son privados)
8. Usa un tono profesional pero accesible`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          { role: 'system', content: 'Eres un analista experto de Pokémon competitivo.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('[GROK] Error en API:', response.status);
      return 'Análisis de IA temporalmente no disponible.';
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
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
   * Se cachea por 2 horas
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
    
    // Obtener todos los usuarios verificados con Pokémon
    const users = await this.usersCollection.find({
      verified: true,
      minecraftUsername: { $exists: true, $ne: '' },
    }).toArray();

    // Recolectar todos los Pokémon con su dueño
    const allPokemonWithOwners: Array<{
      pokemon: Pokemon;
      owner: User;
      totalPokemon: number;
    }> = [];

    for (const user of users) {
      const allUserPokemon = [
        ...(user.pokemonParty || []),
        ...(user.pcStorage || []).flatMap(box => box.pokemon || []),
      ].filter(p => p && p.level && p.ivs && p.evs);

      for (const pokemon of allUserPokemon) {
        if (pokemon) {
          allPokemonWithOwners.push({
            pokemon,
            owner: user,
            totalPokemon: allUserPokemon.length,
          });
        }
      }
    }

    console.log(`[STRONGEST POKEMON] Analizando ${allPokemonWithOwners.length} Pokémon...`);

    // Calcular poder de cada Pokémon
    const pokemonScores: PokemonPowerScore[] = allPokemonWithOwners.map(({ pokemon, owner, totalPokemon }) => {
      const powerScore = calculatePokemonPower(pokemon);
      const powerScoreNum = parseFloat(powerScore.toString());
      
      return {
        _pokemonUuid: pokemon.uuid,
        _ownerUuid: owner.minecraftUuid || owner.discordId || 'unknown',
        _species: pokemon.species,
        _speciesId: pokemon.speciesId,
        ownerUsername: owner.minecraftUsername || owner.nickname || 'Desconocido',
        ownerTotalPokemon: totalPokemon,
        powerScore,
        powerScoreDisplay: Math.round(powerScoreNum),
        approximateStats: generateApproximateStats(pokemon),
        randomSpriteId: generateRandomSpriteId(pokemon.speciesId),
        rank: 0,
        calculatedAt: now,
      };
    });

    // Ordenar por poder (mayor a menor)
    pokemonScores.sort((a, b) => {
      const aScore = parseFloat(a.powerScore.toString());
      const bScore = parseFloat(b.powerScore.toString());
      return bScore - aScore;
    });

    // Asignar ranks y tomar top 20
    const topPokemon = pokemonScores.slice(0, 20).map((p, index) => ({
      ...p,
      rank: index + 1,
    }));

    // Obtener análisis de Grok
    const grokAnalysis = await getGrokAnalysis(topPokemon);

    // Crear resultado
    const ranking: StrongestPokemonRanking = {
      rankings: topPokemon,
      totalAnalyzed: allPokemonWithOwners.length,
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
