/**
 * Pity Manager Service
 * Cobblemon Los Pitufos - Backend API
 * 
 * Gestiona el sistema de pity del gacha:
 * - Soft pity: Aumenta probabilidad de Epic+ después de 75 tiradas
 * - Hard pity: Garantiza Epic+ en la tirada 90
 * - Sistema 50/50 para items destacados
 */

import { Collection, ClientSession } from 'mongodb';
import { 
  GachaPity, 
  PityStatus, 
  PITY_CONFIG,
  BASE_PROBABILITIES,
  Rarity 
} from '../../shared/types/pokemon-gacha.types.js';

export class PityManagerService {
  constructor(private pityCollection: Collection<GachaPity>) {}

  /**
   * Obtiene el contador de pity actual de un jugador para un banner
   */
  async getPityCount(playerId: string, bannerId: string, session?: ClientSession): Promise<number> {
    const pity = await this.pityCollection.findOne(
      { playerId, bannerId },
      { session }
    );
    return pity?.pullsSinceEpic || 0;
  }

  /**
   * Obtiene el estado completo de pity de un jugador
   */
  async getPityStatus(playerId: string, bannerId: string, session?: ClientSession): Promise<PityStatus> {
    const pity = await this.pityCollection.findOne(
      { playerId, bannerId },
      { session }
    );

    const pullsSinceEpic = pity?.pullsSinceEpic || 0;
    const softPityActive = pullsSinceEpic >= PITY_CONFIG.softPityStart;
    const pullsUntilHardPity = Math.max(0, PITY_CONFIG.hardPity - pullsSinceEpic);
    
    // Calcular probabilidad actual de Epic+
    let currentEpicChance = BASE_PROBABILITIES.epic + BASE_PROBABILITIES.legendary + BASE_PROBABILITIES.mythic;
    
    if (softPityActive) {
      const softPityPulls = pullsSinceEpic - PITY_CONFIG.softPityStart;
      currentEpicChance += softPityPulls * PITY_CONFIG.softPityIncrement;
    }

    // Hard pity = 100% chance
    if (pullsSinceEpic >= PITY_CONFIG.hardPity - 1) {
      currentEpicChance = 1.0;
    }

    return {
      pullsSinceEpic,
      pullsSinceLegendary: pity?.pullsSinceLegendary || 0,
      lost5050: pity?.lost5050 || false,
      totalPulls: pity?.totalPulls || 0,
      totalSpent: pity?.totalSpent || 0,
      softPityActive,
      pullsUntilHardPity,
      currentEpicChance: Math.min(currentEpicChance, 1.0),
    };
  }

  /**
   * Incrementa el contador de pity después de una tirada sin Epic+
   */
  async incrementPity(
    playerId: string, 
    bannerId: string, 
    bannerType: 'standard' | 'limited' | 'event',
    cost: number,
    session?: ClientSession
  ): Promise<number> {
    const result = await this.pityCollection.findOneAndUpdate(
      { playerId, bannerId },
      {
        $inc: {
          pullsSinceEpic: 1,
          pullsSinceLegendary: 1,
          totalPulls: 1,
          totalSpent: cost,
        },
        $set: {
          bannerType,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          playerId,
          bannerId,
          lost5050: false,
        },
      },
      { 
        upsert: true, 
        returnDocument: 'after',
        session,
      }
    );

    return result?.pullsSinceEpic || 1;
  }

  /**
   * Resetea el contador de pity después de obtener Epic+
   */
  async resetPity(
    playerId: string, 
    bannerId: string, 
    rarity: Rarity,
    session?: ClientSession
  ): Promise<void> {
    const updateFields: Record<string, any> = {
      pullsSinceEpic: 0,
      updatedAt: new Date(),
    };

    // Si obtuvo Legendary o Mythic, también resetear ese contador
    if (rarity === 'legendary' || rarity === 'mythic') {
      updateFields.pullsSinceLegendary = 0;
    }

    await this.pityCollection.updateOne(
      { playerId, bannerId },
      { $set: updateFields },
      { session }
    );
  }

  /**
   * Obtiene el estado del 50/50 (si perdió el anterior)
   */
  async getLost5050Status(playerId: string, bannerId: string, session?: ClientSession): Promise<boolean> {
    const pity = await this.pityCollection.findOne(
      { playerId, bannerId },
      { session }
    );
    return pity?.lost5050 || false;
  }

  /**
   * Actualiza el estado del 50/50
   */
  async setLost5050Status(
    playerId: string, 
    bannerId: string, 
    lost: boolean,
    session?: ClientSession
  ): Promise<void> {
    await this.pityCollection.updateOne(
      { playerId, bannerId },
      { 
        $set: { 
          lost5050: lost,
          updatedAt: new Date(),
        } 
      },
      { upsert: true, session }
    );
  }

  /**
   * Calcula la probabilidad ajustada por soft pity
   */
  calculateSoftPityBonus(pullsSinceEpic: number): number {
    if (pullsSinceEpic < PITY_CONFIG.softPityStart) {
      return 0;
    }

    const softPityPulls = pullsSinceEpic - PITY_CONFIG.softPityStart;
    return softPityPulls * PITY_CONFIG.softPityIncrement;
  }

  /**
   * Verifica si se debe activar el hard pity
   */
  isHardPityActive(pullsSinceEpic: number): boolean {
    return pullsSinceEpic >= PITY_CONFIG.hardPity - 1;
  }

  /**
   * Obtiene estadísticas de pity para todos los banners de un jugador
   */
  async getAllPityStats(playerId: string): Promise<GachaPity[]> {
    return await this.pityCollection.find({ playerId }).toArray();
  }

  /**
   * Inicializa el pity para un nuevo jugador/banner
   */
  async initializePity(
    playerId: string, 
    bannerId: string, 
    bannerType: 'standard' | 'limited' | 'event',
    session?: ClientSession
  ): Promise<GachaPity> {
    const newPity: GachaPity = {
      playerId,
      bannerId,
      bannerType,
      pullsSinceEpic: 0,
      pullsSinceLegendary: 0,
      lost5050: false,
      totalPulls: 0,
      totalSpent: 0,
      updatedAt: new Date(),
    };

    await this.pityCollection.updateOne(
      { playerId, bannerId },
      { $setOnInsert: newPity },
      { upsert: true, session }
    );

    return newPity;
  }
}
