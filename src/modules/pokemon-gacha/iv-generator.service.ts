/**
 * IV Generator Service
 * Cobblemon Los Pitufos - Backend API
 * 
 * Genera IVs (Individual Values) para Pokémon basados en su rareza
 */

import { CryptoRngService, cryptoRng } from './crypto-rng.service.js';
import { PokemonIVs, Rarity, IV_RANGES } from '../../shared/types/pokemon-gacha.types.js';

export class IVGeneratorService {
  constructor(private rng: CryptoRngService = cryptoRng) {}

  /**
   * Genera IVs para un Pokémon basado en su rareza
   * Los rangos de IVs varían según la rareza:
   * - Common: 0-15
   * - Uncommon: 5-20
   * - Rare: 10-25
   * - Epic: 15-28
   * - Legendary: 20-30
   * - Mythic: 25-31
   */
  generateIVs(rarity: Rarity): PokemonIVs {
    const range = IV_RANGES[rarity];
    
    if (!range) {
      throw new Error(`Invalid rarity: ${rarity}`);
    }

    return {
      hp: this.rng.randomInt(range.min, range.max),
      atk: this.rng.randomInt(range.min, range.max),
      def: this.rng.randomInt(range.min, range.max),
      spa: this.rng.randomInt(range.min, range.max),
      spd: this.rng.randomInt(range.min, range.max),
      spe: this.rng.randomInt(range.min, range.max),
    };
  }

  /**
   * Genera IVs con garantía de al menos N IVs perfectos (31)
   * Útil para Pokémon de alta rareza
   */
  generateIVsWithPerfects(rarity: Rarity, guaranteedPerfects: number = 0): PokemonIVs {
    const ivs = this.generateIVs(rarity);
    
    if (guaranteedPerfects <= 0) {
      return ivs;
    }

    // Seleccionar stats aleatorios para ser perfectos
    const stats: (keyof PokemonIVs)[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
    const perfectStats = this.rng.sample(stats, Math.min(guaranteedPerfects, 6));

    for (const stat of perfectStats) {
      ivs[stat] = 31;
    }

    return ivs;
  }

  /**
   * Calcula el total de IVs
   */
  calculateIVTotal(ivs: PokemonIVs): number {
    return ivs.hp + ivs.atk + ivs.def + ivs.spa + ivs.spd + ivs.spe;
  }

  /**
   * Calcula el porcentaje de perfección de IVs (0-100%)
   */
  calculateIVPercentage(ivs: PokemonIVs): number {
    const total = this.calculateIVTotal(ivs);
    const maxTotal = 31 * 6; // 186
    return Math.round((total / maxTotal) * 100);
  }

  /**
   * Cuenta cuántos IVs son perfectos (31)
   */
  countPerfectIVs(ivs: PokemonIVs): number {
    let count = 0;
    if (ivs.hp === 31) count++;
    if (ivs.atk === 31) count++;
    if (ivs.def === 31) count++;
    if (ivs.spa === 31) count++;
    if (ivs.spd === 31) count++;
    if (ivs.spe === 31) count++;
    return count;
  }

  /**
   * Valida que los IVs estén dentro del rango esperado para la rareza
   */
  validateIVsForRarity(ivs: PokemonIVs, rarity: Rarity): boolean {
    const range = IV_RANGES[rarity];
    
    if (!range) {
      return false;
    }

    const stats = [ivs.hp, ivs.atk, ivs.def, ivs.spa, ivs.spd, ivs.spe];
    
    for (const stat of stats) {
      // Permitir IVs perfectos incluso si están fuera del rango base
      if (stat !== 31 && (stat < range.min || stat > range.max)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Genera una descripción textual de los IVs
   */
  describeIVs(ivs: PokemonIVs): string {
    const percentage = this.calculateIVPercentage(ivs);
    const perfects = this.countPerfectIVs(ivs);

    if (percentage >= 95) {
      return '¡Increíble! IVs casi perfectos';
    } else if (percentage >= 85) {
      return 'Excelentes IVs';
    } else if (percentage >= 70) {
      return 'Buenos IVs';
    } else if (percentage >= 50) {
      return 'IVs decentes';
    } else {
      return 'IVs bajos';
    }
  }
}

// Singleton instance
export const ivGenerator = new IVGeneratorService();
