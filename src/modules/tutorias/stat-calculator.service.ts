import { PokemonStats, StatCalculation } from '../../shared/types/tutorias.types';

// Nature modifiers: [boosted stat, reduced stat]
const NATURE_MODIFIERS: Record<string, [keyof PokemonStats | null, keyof PokemonStats | null]> = {
  // Neutral natures (no change)
  'Hardy': [null, null],
  'Docile': [null, null],
  'Serious': [null, null],
  'Bashful': [null, null],
  'Quirky': [null, null],
  
  // Attack boosting
  'Lonely': ['attack', 'defense'],
  'Brave': ['attack', 'speed'],
  'Adamant': ['attack', 'specialAttack'],
  'Naughty': ['attack', 'specialDefense'],
  
  // Defense boosting
  'Bold': ['defense', 'attack'],
  'Relaxed': ['defense', 'speed'],
  'Impish': ['defense', 'specialAttack'],
  'Lax': ['defense', 'specialDefense'],
  
  // Special Attack boosting
  'Modest': ['specialAttack', 'attack'],
  'Mild': ['specialAttack', 'defense'],
  'Quiet': ['specialAttack', 'speed'],
  'Rash': ['specialAttack', 'specialDefense'],
  
  // Special Defense boosting
  'Calm': ['specialDefense', 'attack'],
  'Gentle': ['specialDefense', 'defense'],
  'Sassy': ['specialDefense', 'speed'],
  'Careful': ['specialDefense', 'specialAttack'],
  
  // Speed boosting
  'Timid': ['speed', 'attack'],
  'Hasty': ['speed', 'defense'],
  'Jolly': ['speed', 'specialAttack'],
  'Naive': ['speed', 'specialDefense']
};

// Base stats for common Pokemon (simplified - would need full Pokedex)
const BASE_STATS: Record<string, PokemonStats> = {
  'pikachu': { hp: 35, attack: 55, defense: 40, specialAttack: 50, specialDefense: 50, speed: 90 },
  'charizard': { hp: 78, attack: 84, defense: 78, specialAttack: 109, specialDefense: 85, speed: 100 },
  'blastoise': { hp: 79, attack: 83, defense: 100, specialAttack: 85, specialDefense: 105, speed: 78 },
  'venusaur': { hp: 80, attack: 82, defense: 83, specialAttack: 100, specialDefense: 100, speed: 80 },
  'gengar': { hp: 60, attack: 65, defense: 60, specialAttack: 130, specialDefense: 75, speed: 110 },
  'dragonite': { hp: 91, attack: 134, defense: 95, specialAttack: 100, specialDefense: 100, speed: 80 },
  'tyranitar': { hp: 100, attack: 134, defense: 110, specialAttack: 95, specialDefense: 100, speed: 61 },
  'garchomp': { hp: 108, attack: 130, defense: 95, specialAttack: 80, specialDefense: 85, speed: 102 },
  'lucario': { hp: 70, attack: 110, defense: 70, specialAttack: 115, specialDefense: 70, speed: 90 },
  // Default for unknown Pokemon
  'default': { hp: 80, attack: 80, defense: 80, specialAttack: 80, specialDefense: 80, speed: 80 }
};

export class StatCalculatorService {
  /**
   * Calculate IV percentage
   * Property 12: IV Percentage Calculation - (sum of all IVs / 186) * 100
   * Max IVs = 31 * 6 = 186
   */
  calculateIVPercentage(ivs: PokemonStats): number {
    const sum = ivs.hp + ivs.attack + ivs.defense + ivs.specialAttack + ivs.specialDefense + ivs.speed;
    const percentage = (sum / 186) * 100;
    return Math.round(percentage * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate remaining EVs
   * Property 13: EV Remaining Calculation - 510 - sum of all current EVs
   * Max EVs = 510
   */
  calculateEVRemaining(evs: PokemonStats): number {
    const sum = evs.hp + evs.attack + evs.defense + evs.specialAttack + evs.specialDefense + evs.speed;
    return Math.max(0, 510 - sum);
  }

  /**
   * Get nature modifier for a stat
   * Property 14: Stat Calculation with Nature - 1.1 for boost, 0.9 for reduction, 1.0 otherwise
   */
  getNatureModifier(nature: string, stat: keyof PokemonStats): number {
    const modifier = NATURE_MODIFIERS[nature];
    if (!modifier) return 1.0;

    const [boosted, reduced] = modifier;
    
    if (boosted === stat) return 1.1;
    if (reduced === stat) return 0.9;
    return 1.0;
  }

  /**
   * Calculate a single stat at a given level
   * HP formula: floor((2 * Base + IV + floor(EV/4)) * Level / 100) + Level + 10
   * Other stats: floor((floor((2 * Base + IV + floor(EV/4)) * Level / 100) + 5) * Nature)
   */
  calculateStat(
    statName: keyof PokemonStats,
    baseStat: number,
    iv: number,
    ev: number,
    level: number,
    nature: string
  ): number {
    const evContribution = Math.floor(ev / 4);
    
    if (statName === 'hp') {
      // HP formula (no nature modifier)
      return Math.floor(((2 * baseStat + iv + evContribution) * level) / 100) + level + 10;
    } else {
      // Other stats formula
      const natureModifier = this.getNatureModifier(nature, statName);
      const basePart = Math.floor(((2 * baseStat + iv + evContribution) * level) / 100) + 5;
      return Math.floor(basePart * natureModifier);
    }
  }

  /**
   * Calculate all stats for a Pokemon at a given level
   */
  calculateStats(pokemon: any, evDistribution: PokemonStats, level: number): PokemonStats {
    const species = pokemon.species?.toLowerCase() || 'default';
    const baseStats = BASE_STATS[species] || BASE_STATS['default'];
    const nature = pokemon.nature || 'Hardy';
    const ivs = pokemon.ivs || { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };

    return {
      hp: this.calculateStat('hp', baseStats.hp, ivs.hp || 0, evDistribution.hp, level, nature),
      attack: this.calculateStat('attack', baseStats.attack, ivs.attack || 0, evDistribution.attack, level, nature),
      defense: this.calculateStat('defense', baseStats.defense, ivs.defense || 0, evDistribution.defense, level, nature),
      specialAttack: this.calculateStat('specialAttack', baseStats.specialAttack, ivs.specialAttack || 0, evDistribution.specialAttack, level, nature),
      specialDefense: this.calculateStat('specialDefense', baseStats.specialDefense, ivs.specialDefense || 0, evDistribution.specialDefense, level, nature),
      speed: this.calculateStat('speed', baseStats.speed, ivs.speed || 0, evDistribution.speed, level, nature)
    };
  }

  /**
   * Get detailed stat calculation breakdown
   */
  getStatBreakdown(
    statName: keyof PokemonStats,
    baseStat: number,
    iv: number,
    ev: number,
    level: number,
    nature: string
  ): StatCalculation {
    const natureModifier = statName === 'hp' ? 1.0 : this.getNatureModifier(nature, statName);
    const final = this.calculateStat(statName, baseStat, iv, ev, level, nature);

    return {
      base: baseStat,
      iv,
      ev,
      nature: natureModifier,
      level,
      final
    };
  }

  /**
   * Validate EV distribution (max 510 total, max 252 per stat)
   */
  validateEVDistribution(evs: PokemonStats): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const stats: (keyof PokemonStats)[] = ['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'];
    
    let total = 0;
    for (const stat of stats) {
      const value = evs[stat];
      
      if (value < 0) {
        errors.push(`${stat} no puede ser negativo`);
      }
      if (value > 252) {
        errors.push(`${stat} no puede exceder 252`);
      }
      total += value;
    }

    if (total > 510) {
      errors.push(`Total de EVs (${total}) excede el máximo de 510`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get optimal EV spread suggestions based on Pokemon role
   */
  suggestEVSpread(pokemon: any, role: 'physical_attacker' | 'special_attacker' | 'physical_wall' | 'special_wall' | 'mixed' | 'speed'): PokemonStats {
    const spreads: Record<string, PokemonStats> = {
      'physical_attacker': { hp: 4, attack: 252, defense: 0, specialAttack: 0, specialDefense: 0, speed: 252 },
      'special_attacker': { hp: 4, attack: 0, defense: 0, specialAttack: 252, specialDefense: 0, speed: 252 },
      'physical_wall': { hp: 252, attack: 0, defense: 252, specialAttack: 0, specialDefense: 4, speed: 0 },
      'special_wall': { hp: 252, attack: 0, defense: 4, specialAttack: 0, specialDefense: 252, speed: 0 },
      'mixed': { hp: 4, attack: 126, defense: 0, specialAttack: 126, specialDefense: 0, speed: 252 },
      'speed': { hp: 4, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 252 }
    };

    return spreads[role] || spreads['physical_attacker'];
  }

  /**
   * Get base stats for a species
   */
  getBaseStats(species: string): PokemonStats {
    return BASE_STATS[species.toLowerCase()] || BASE_STATS['default'];
  }
}
