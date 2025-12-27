/**
 * Epitomized Path Service
 * Cobblemon Los Pitufos - Backend API
 * 
 * Sistema de "Camino Epitomizado" para garantizar Pokémon destacados
 * Similar al sistema de Genshin Impact
 */

import { Collection, ClientSession } from 'mongodb';
import { ObjectId } from 'mongodb';

export interface EpitomizedPathRecord {
  _id?: ObjectId;
  playerId: string;
  bannerId: string;
  targetPokemonId: number;
  targetPokemonName: string;
  fatePoints: number; // 0, 1, o 2
  createdAt: Date;
  updatedAt: Date;
}

// Configuración del sistema
const EPITOMIZED_CONFIG = {
  maxFatePoints: 2, // Puntos necesarios para garantizar el objetivo
  resetOnBannerEnd: true,
};

export class EpitomizedPathService {
  constructor(private epitomizedCollection: Collection<EpitomizedPathRecord>) {}

  /**
   * Establece el objetivo del Camino Epitomizado
   */
  async setTarget(
    playerId: string,
    bannerId: string,
    targetPokemonId: number,
    targetPokemonName: string,
    session?: ClientSession
  ): Promise<{
    success: boolean;
    message: string;
    fatePoints: number;
  }> {
    const now = new Date();

    // Verificar si ya tiene un objetivo para este banner
    const existing = await this.epitomizedCollection.findOne(
      { playerId, bannerId },
      { session }
    );

    if (existing && existing.targetPokemonId === targetPokemonId) {
      return {
        success: true,
        message: `Ya tienes a ${targetPokemonName} como objetivo.`,
        fatePoints: existing.fatePoints,
      };
    }

    // Si cambia de objetivo, se reinician los Fate Points
    const fatePoints = existing?.targetPokemonId !== targetPokemonId ? 0 : (existing?.fatePoints || 0);

    await this.epitomizedCollection.updateOne(
      { playerId, bannerId },
      {
        $set: {
          targetPokemonId,
          targetPokemonName,
          fatePoints,
          updatedAt: now,
        },
        $setOnInsert: {
          playerId,
          bannerId,
          createdAt: now,
        },
      },
      { upsert: true, session }
    );

    const message = existing?.targetPokemonId !== targetPokemonId && existing
      ? `Cambiaste tu objetivo a ${targetPokemonName}. Fate Points reiniciados.`
      : `Estableciste a ${targetPokemonName} como tu objetivo.`;

    return {
      success: true,
      message,
      fatePoints,
    };
  }

  /**
   * Obtiene el objetivo actual del jugador para un banner
   */
  async getTarget(
    playerId: string,
    bannerId: string,
    session?: ClientSession
  ): Promise<EpitomizedPathRecord | null> {
    return await this.epitomizedCollection.findOne(
      { playerId, bannerId },
      { session }
    );
  }

  /**
   * Obtiene los Fate Points actuales
   */
  async getFatePoints(
    playerId: string,
    bannerId: string,
    session?: ClientSession
  ): Promise<number> {
    const record = await this.getTarget(playerId, bannerId, session);
    return record?.fatePoints || 0;
  }

  /**
   * Añade un Fate Point (cuando obtiene destacado pero no el objetivo)
   */
  async addFatePoint(
    playerId: string,
    bannerId: string,
    session?: ClientSession
  ): Promise<{
    newFatePoints: number;
    willGuaranteeNext: boolean;
  }> {
    const record = await this.getTarget(playerId, bannerId, session);

    if (!record) {
      return {
        newFatePoints: 0,
        willGuaranteeNext: false,
      };
    }

    const newFatePoints = Math.min(record.fatePoints + 1, EPITOMIZED_CONFIG.maxFatePoints);

    await this.epitomizedCollection.updateOne(
      { playerId, bannerId },
      {
        $set: {
          fatePoints: newFatePoints,
          updatedAt: new Date(),
        },
      },
      { session }
    );

    return {
      newFatePoints,
      willGuaranteeNext: newFatePoints >= EPITOMIZED_CONFIG.maxFatePoints,
    };
  }

  /**
   * Reinicia los Fate Points (cuando obtiene el objetivo)
   */
  async resetFatePoints(
    playerId: string,
    bannerId: string,
    session?: ClientSession
  ): Promise<void> {
    await this.epitomizedCollection.updateOne(
      { playerId, bannerId },
      {
        $set: {
          fatePoints: 0,
          updatedAt: new Date(),
        },
      },
      { session }
    );
  }

  /**
   * Verifica si se debe garantizar el objetivo
   */
  async shouldGuaranteeTarget(
    playerId: string,
    bannerId: string,
    session?: ClientSession
  ): Promise<boolean> {
    const fatePoints = await this.getFatePoints(playerId, bannerId, session);
    return fatePoints >= EPITOMIZED_CONFIG.maxFatePoints;
  }

  /**
   * Procesa el resultado de una tirada destacada
   * Retorna si se debe forzar el objetivo
   */
  async processEpitomizedPull(
    playerId: string,
    bannerId: string,
    obtainedPokemonId: number,
    session?: ClientSession
  ): Promise<{
    wasTargetObtained: boolean;
    fatePointsAdded: boolean;
    newFatePoints: number;
    shouldForceTarget: boolean;
  }> {
    const record = await this.getTarget(playerId, bannerId, session);

    // Si no tiene objetivo establecido, no hacer nada
    if (!record) {
      return {
        wasTargetObtained: false,
        fatePointsAdded: false,
        newFatePoints: 0,
        shouldForceTarget: false,
      };
    }

    // Si obtuvo el objetivo
    if (obtainedPokemonId === record.targetPokemonId) {
      await this.resetFatePoints(playerId, bannerId, session);
      return {
        wasTargetObtained: true,
        fatePointsAdded: false,
        newFatePoints: 0,
        shouldForceTarget: false,
      };
    }

    // Si no obtuvo el objetivo, añadir Fate Point
    const { newFatePoints, willGuaranteeNext } = await this.addFatePoint(
      playerId,
      bannerId,
      session
    );

    return {
      wasTargetObtained: false,
      fatePointsAdded: true,
      newFatePoints,
      shouldForceTarget: willGuaranteeNext,
    };
  }

  /**
   * Obtiene el estado completo del Camino Epitomizado
   */
  async getEpitomizedStatus(
    playerId: string,
    bannerId: string
  ): Promise<{
    hasTarget: boolean;
    targetPokemonId: number | null;
    targetPokemonName: string | null;
    fatePoints: number;
    maxFatePoints: number;
    willGuaranteeNext: boolean;
  }> {
    const record = await this.getTarget(playerId, bannerId);

    if (!record) {
      return {
        hasTarget: false,
        targetPokemonId: null,
        targetPokemonName: null,
        fatePoints: 0,
        maxFatePoints: EPITOMIZED_CONFIG.maxFatePoints,
        willGuaranteeNext: false,
      };
    }

    return {
      hasTarget: true,
      targetPokemonId: record.targetPokemonId,
      targetPokemonName: record.targetPokemonName,
      fatePoints: record.fatePoints,
      maxFatePoints: EPITOMIZED_CONFIG.maxFatePoints,
      willGuaranteeNext: record.fatePoints >= EPITOMIZED_CONFIG.maxFatePoints,
    };
  }

  /**
   * Elimina el objetivo (opcional)
   */
  async clearTarget(
    playerId: string,
    bannerId: string,
    session?: ClientSession
  ): Promise<boolean> {
    const result = await this.epitomizedCollection.deleteOne(
      { playerId, bannerId },
      { session }
    );
    return result.deletedCount > 0;
  }

  /**
   * Reinicia todos los Caminos Epitomizados de un banner (cuando termina)
   */
  async resetAllForBanner(bannerId: string): Promise<number> {
    if (!EPITOMIZED_CONFIG.resetOnBannerEnd) return 0;

    const result = await this.epitomizedCollection.deleteMany({ bannerId });
    return result.deletedCount;
  }
}