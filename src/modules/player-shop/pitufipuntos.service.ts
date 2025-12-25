/**
 * Pitufipuntos Calculator Service
 * Cobblemon Los Pitufos - Backend API
 * 
 * Calcula los Pitufipuntos (puntos de poder) de un Pokémon basándose en:
 * - Stats base de la especie
 * - IVs individuales
 * - EVs entrenados
 * - Nivel
 * - Naturaleza
 * - Habilidad (bonus por hidden ability)
 * - Shiny status
 * - Tipos
 */

import { Pokemon, PokemonStats } from '../../shared/types/pokemon.types.js';
import { PitufipuntosResult, PitufipuntosBreakdown, ListingPokemon } from '../../shared/types/player-shop.types.js';

// ============================================
// DATOS DE NATURALEZAS
// ============================================

interface NatureEffect {
  increased?: keyof PokemonStats;
  decreased?: keyof PokemonStats;
}

const NATURE_EFFECTS: Record<string, NatureEffect> = {
  // Neutral natures (no effect)
  hardy: {},
  docile: {},
  serious: {},
  bashful: {},
  quirky: {},
  
  // Attack boosting
  lonely: { increased: 'attack', decreased: 'defense' },
  brave: { increased: 'attack', decreased: 'speed' },
  adamant: { increased: 'attack', decreased: 'spAttack' },
  naughty: { increased: 'attack', decreased: 'spDefense' },
  
  // Defense boosting
  bold: { increased: 'defense', decreased: 'attack' },
  relaxed: { increased: 'defense', decreased: 'speed' },
  impish: { increased: 'defense', decreased: 'spAttack' },
  lax: { increased: 'defense', decreased: 'spDefense' },
  
  // Speed boosting
  timid: { increased: 'speed', decreased: 'attack' },
  hasty: { increased: 'speed', decreased: 'defense' },
  jolly: { increased: 'speed', decreased: 'spAttack' },
  naive: { increased: 'speed', decreased: 'spDefense' },
  
  // Sp. Attack boosting
  modest: { increased: 'spAttack', decreased: 'attack' },
  mild: { increased: 'spAttack', decreased: 'defense' },
  quiet: { increased: 'spAttack', decreased: 'speed' },
  rash: { increased: 'spAttack', decreased: 'spDefense' },
  
  // Sp. Defense boosting
  calm: { increased: 'spDefense', decreased: 'attack' },
  gentle: { increased: 'spDefense', decreased: 'defense' },
  sassy: { increased: 'spDefense', decreased: 'speed' },
  careful: { increased: 'spDefense', decreased: 'spAttack' },
};

// ============================================
// DATOS DE TIPOS
// ============================================

// Tipos considerados "premium" por su efectividad competitiva
const PREMIUM_TYPES = ['Dragon', 'Steel', 'Fairy', 'Ghost', 'Dark'];
const GOOD_TYPES = ['Fire', 'Water', 'Electric', 'Ground', 'Fighting', 'Psychic'];

// ============================================
// HABILIDADES OCULTAS CONOCIDAS
// ============================================

// Lista de habilidades que son típicamente hidden abilities
const HIDDEN_ABILITIES: Set<string> = new Set([
  // Gen 1 starters
  'chlorophyll', 'solar-power', 'rain-dish',
  // Common hidden abilities
  'protean', 'libero', 'speed-boost', 'multiscale', 'marvel-scale',
  'regenerator', 'magic-bounce', 'sheer-force', 'moxie', 'intimidate',
  'technician', 'adaptability', 'huge-power', 'pure-power', 'sand-rush',
  'swift-swim', 'drought', 'drizzle', 'sand-stream', 'snow-warning',
  'unaware', 'contrary', 'prankster', 'gale-wings', 'pixilate',
  'refrigerate', 'aerilate', 'galvanize', 'scrappy', 'iron-fist',
  'skill-link', 'serene-grace', 'hustle', 'no-guard', 'sturdy',
  'magic-guard', 'wonder-guard', 'levitate', 'flash-fire', 'water-absorb',
  'volt-absorb', 'lightning-rod', 'storm-drain', 'sap-sipper',
  'thick-fat', 'fur-coat', 'fluffy', 'ice-scales', 'filter',
  'solid-rock', 'prism-armor', 'shadow-shield', 'full-metal-body',
  'beast-boost', 'soul-heart', 'battle-bond', 'power-construct',
  'shields-down', 'schooling', 'disguise', 'rks-system', 'comatose',
  'queenly-majesty', 'innards-out', 'dancer', 'battery', 'fluffy',
  'dazzling', 'tangling-hair', 'receiver', 'power-of-alchemy',
  'corrosion', 'merciless', 'stamina', 'wimp-out', 'emergency-exit',
  'water-compaction', 'steelworker', 'berserk', 'slush-rush',
  'long-reach', 'liquid-voice', 'triage', 'galvanize', 'surge-surfer',
  'neuroforce', 'intrepid-sword', 'dauntless-shield', 'libero',
  'ball-fetch', 'cotton-down', 'propeller-tail', 'mirror-armor',
  'gulp-missile', 'stalwart', 'steam-engine', 'punk-rock', 'sand-spit',
  'ice-scales', 'ripen', 'ice-face', 'power-spot', 'mimicry',
  'screen-cleaner', 'steely-spirit', 'perish-body', 'wandering-spirit',
  'gorilla-tactics', 'neutralizing-gas', 'pastel-veil', 'hunger-switch',
  'quick-draw', 'unseen-fist', 'curious-medicine', 'transistor',
  'dragons-maw', 'chilling-neigh', 'grim-neigh', 'as-one',
]);

// ============================================
// SERVICIO PRINCIPAL
// ============================================

export class PitufipuntosService {
  /**
   * Calcula los Pitufipuntos de un Pokémon
   */
  calculate(pokemon: Pokemon | ListingPokemon): PitufipuntosResult {
    const breakdown = this.getBreakdown(pokemon);
    const total = this.sumBreakdown(breakdown);
    
    return {
      total,
      breakdown,
    };
  }

  /**
   * Obtiene el desglose de Pitufipuntos
   */
  getBreakdown(pokemon: Pokemon | ListingPokemon): PitufipuntosBreakdown {
    return {
      baseStatTotal: this.calculateBaseStatTotal(pokemon.speciesId),
      ivBonus: this.calculateIVBonus(pokemon.ivs),
      evBonus: this.calculateEVBonus(pokemon.evs),
      levelBonus: this.calculateLevelBonus(pokemon.level),
      natureBonus: this.calculateNatureBonus(pokemon.nature, pokemon.speciesId),
      abilityBonus: this.calculateAbilityBonus(pokemon.ability),
      shinyBonus: this.calculateShinyBonus(pokemon.shiny),
      typeBonus: this.calculateTypeBonus(pokemon.speciesId),
    };
  }

  /**
   * Suma todos los componentes del breakdown
   */
  private sumBreakdown(breakdown: PitufipuntosBreakdown): number {
    return (
      breakdown.baseStatTotal +
      breakdown.ivBonus +
      breakdown.evBonus +
      breakdown.levelBonus +
      breakdown.natureBonus +
      breakdown.abilityBonus +
      breakdown.shinyBonus +
      breakdown.typeBonus
    );
  }

  /**
   * Calcula el total de stats base de la especie
   * Usa valores aproximados basados en el speciesId
   */
  private calculateBaseStatTotal(speciesId: number): number {
    // Base stat totals aproximados por rango de Pokémon
    // En producción, esto debería venir de una base de datos de especies
    const baseStatEstimates: Record<string, number> = {
      // Legendarios y pseudo-legendarios tienen BST alto
      legendary: 600,
      pseudoLegendary: 600,
      // Pokémon evolucionados completamente
      fullyEvolved: 500,
      // Pokémon de segunda etapa
      midEvolution: 400,
      // Pokémon básicos
      basic: 300,
    };

    // Legendarios conocidos (simplificado)
    const legendaryIds = [
      144, 145, 146, 150, 151, // Gen 1
      243, 244, 245, 249, 250, 251, // Gen 2
      377, 378, 379, 380, 381, 382, 383, 384, 385, 386, // Gen 3
      480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493, // Gen 4
      494, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649, // Gen 5
      716, 717, 718, 719, 720, 721, // Gen 6
      785, 786, 787, 788, 789, 790, 791, 792, 800, 801, 802, 807, 808, 809, // Gen 7
      888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898, // Gen 8
    ];

    // Pseudo-legendarios
    const pseudoLegendaryIds = [
      149, // Dragonite
      248, // Tyranitar
      373, // Salamence
      376, // Metagross
      445, // Garchomp
      635, // Hydreigon
      706, // Goodra
      784, // Kommo-o
      887, // Dragapult
    ];

    if (legendaryIds.includes(speciesId)) {
      return baseStatEstimates.legendary;
    }
    if (pseudoLegendaryIds.includes(speciesId)) {
      return baseStatEstimates.pseudoLegendary;
    }

    // Estimación basada en el ID (los Pokémon más evolucionados tienden a tener IDs más altos en su línea)
    // Esta es una aproximación; en producción usar datos reales
    if (speciesId > 800) {
      return baseStatEstimates.fullyEvolved;
    }
    
    return baseStatEstimates.midEvolution;
  }

  /**
   * Calcula el bonus por IVs
   * Fórmula: IVTotal * 2
   */
  private calculateIVBonus(ivs: PokemonStats): number {
    const ivTotal = ivs.hp + ivs.attack + ivs.defense + 
                    ivs.spAttack + ivs.spDefense + ivs.speed;
    return ivTotal * 2;
  }

  /**
   * Calcula el bonus por EVs
   * Fórmula: EVTotal / 4
   */
  private calculateEVBonus(evs: PokemonStats): number {
    const evTotal = evs.hp + evs.attack + evs.defense + 
                    evs.spAttack + evs.spDefense + evs.speed;
    return Math.floor(evTotal / 4);
  }

  /**
   * Calcula el bonus por nivel
   * Fórmula: level * 5
   */
  private calculateLevelBonus(level: number): number {
    return level * 5;
  }

  /**
   * Calcula el bonus por naturaleza
   * Rango: 0-150 basado en alineación con el rol del Pokémon
   */
  private calculateNatureBonus(nature: string, speciesId: number): number {
    const normalizedNature = nature.toLowerCase();
    const effect = NATURE_EFFECTS[normalizedNature];
    
    if (!effect || (!effect.increased && !effect.decreased)) {
      // Naturaleza neutral
      return 50;
    }

    // Bonus base por tener naturaleza no-neutral
    let bonus = 75;

    // Bonus adicional si la naturaleza es competitivamente buena
    const competitiveNatures = ['adamant', 'jolly', 'modest', 'timid', 'bold', 'calm', 'careful', 'impish'];
    if (competitiveNatures.includes(normalizedNature)) {
      bonus += 50;
    }

    // Bonus adicional si reduce un stat que probablemente no usa
    // (ej: Adamant reduce SpAtk, bueno para atacantes físicos)
    if (effect.decreased === 'spAttack' && effect.increased === 'attack') {
      bonus += 25; // Adamant - perfecto para físicos
    }
    if (effect.decreased === 'attack' && effect.increased === 'spAttack') {
      bonus += 25; // Modest - perfecto para especiales
    }

    return Math.min(bonus, 150);
  }

  /**
   * Calcula el bonus por habilidad
   * 100 puntos si es hidden ability
   */
  private calculateAbilityBonus(ability: string): number {
    const normalizedAbility = ability.toLowerCase().replace(/\s+/g, '-');
    
    if (HIDDEN_ABILITIES.has(normalizedAbility)) {
      return 100;
    }
    
    // Algunas habilidades son muy buenas aunque no sean hidden
    const topTierAbilities = [
      'intimidate', 'levitate', 'magic-guard', 'regenerator',
      'speed-boost', 'huge-power', 'pure-power', 'wonder-guard',
      'protean', 'libero', 'multiscale', 'sturdy',
    ];
    
    if (topTierAbilities.includes(normalizedAbility)) {
      return 75;
    }
    
    return 0;
  }

  /**
   * Calcula el bonus por ser shiny
   * 200 puntos fijos
   */
  private calculateShinyBonus(shiny: boolean): number {
    return shiny ? 200 : 0;
  }

  /**
   * Calcula el bonus por tipo
   * Basado en la efectividad competitiva del tipo
   */
  private calculateTypeBonus(speciesId: number): number {
    // En producción, obtener tipos reales de la base de datos
    // Por ahora, estimación basada en rangos de speciesId
    
    // Bonus base
    let bonus = 0;

    // Algunos Pokémon conocidos por sus buenos tipos
    const dragonTypes = [147, 148, 149, 371, 372, 373, 443, 444, 445, 633, 634, 635];
    const steelTypes = [81, 82, 205, 208, 212, 227, 303, 374, 375, 376, 379, 385];
    const fairyTypes = [35, 36, 39, 40, 122, 173, 174, 175, 176, 183, 184, 209, 210];
    
    if (dragonTypes.includes(speciesId)) {
      bonus += 50;
    }
    if (steelTypes.includes(speciesId)) {
      bonus += 40;
    }
    if (fairyTypes.includes(speciesId)) {
      bonus += 35;
    }

    return bonus;
  }

  /**
   * Compara dos Pokémon por Pitufipuntos
   * Retorna positivo si a > b, negativo si a < b, 0 si iguales
   */
  compare(a: Pokemon | ListingPokemon, b: Pokemon | ListingPokemon): number {
    const pitufipuntosA = this.calculate(a).total;
    const pitufipuntosB = this.calculate(b).total;
    return pitufipuntosA - pitufipuntosB;
  }

  /**
   * Obtiene una descripción textual del nivel de poder
   */
  getPowerTier(total: number): string {
    if (total >= 1500) return 'Legendario';
    if (total >= 1200) return 'Élite';
    if (total >= 900) return 'Experto';
    if (total >= 600) return 'Avanzado';
    if (total >= 400) return 'Intermedio';
    return 'Principiante';
  }

  /**
   * Obtiene el color asociado al nivel de poder
   */
  getPowerColor(total: number): string {
    if (total >= 1500) return '#FFD700'; // Gold
    if (total >= 1200) return '#9B59B6'; // Purple
    if (total >= 900) return '#E74C3C';  // Red
    if (total >= 600) return '#3498DB';  // Blue
    if (total >= 400) return '#2ECC71';  // Green
    return '#95A5A6'; // Gray
  }
}

// Singleton export
export const pitufipuntosService = new PitufipuntosService();
