/**
 * Daily Pull Service
 * Cobblemon Los Pitufos - Backend API
 * 
 * Sistema de tirada diaria gratuita
 */

import { Collection, ClientSession } from 'mongodb';
import { ObjectId } from 'mongodb';

export interface DailyPullRecord {
  _id?: ObjectId;
  playerId: string;
  lastPullDate: Date;
  streak: number;
  totalDailyPulls: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyPullStatus {
  canClaim: boolean;
  timeUntilNextPull: number; // milliseconds
  nextPullTime: Date | null;
  currentStreak: number;
  totalDailyPulls: number;
}

// Configuración de tirada diaria
const DAILY_PULL_CONFIG = {
  resetHourUTC: 0, // Medianoche UTC
  streakBonusEnabled: true,
  maxStreakBonus: 7, // Bonus máximo después de 7 días
};

export class DailyPullService {
  constructor(private dailyPullsCollection: Collection<DailyPullRecord>) {}

  /**
   * Verifica si el jugador puede reclamar su tirada diaria
   */
  async canClaimDailyPull(playerId: string, session?: ClientSession): Promise<boolean> {
    const record = await this.dailyPullsCollection.findOne(
      { playerId },
      { session }
    );

    if (!record) return true; // Primera vez

    return this.isNewDay(record.lastPullDate);
  }

  /**
   * Obtiene el estado completo de la tirada diaria
   */
  async getDailyPullStatus(playerId: string, session?: ClientSession): Promise<DailyPullStatus> {
    const record = await this.dailyPullsCollection.findOne(
      { playerId },
      { session }
    );

    const now = new Date();
    const nextReset = this.getNextResetTime();
    
    if (!record) {
      return {
        canClaim: true,
        timeUntilNextPull: 0,
        nextPullTime: null,
        currentStreak: 0,
        totalDailyPulls: 0,
      };
    }

    const canClaim = this.isNewDay(record.lastPullDate);
    const timeUntilNextPull = canClaim ? 0 : nextReset.getTime() - now.getTime();

    // Calcular streak actual
    let currentStreak = record.streak;
    if (!canClaim) {
      // Si ya reclamó hoy, el streak es el actual
    } else if (this.isYesterday(record.lastPullDate)) {
      // Si la última fue ayer, el streak continúa
      currentStreak = record.streak;
    } else {
      // Si pasó más de un día, el streak se reinicia
      currentStreak = 0;
    }

    return {
      canClaim,
      timeUntilNextPull: Math.max(0, timeUntilNextPull),
      nextPullTime: canClaim ? null : nextReset,
      currentStreak,
      totalDailyPulls: record.totalDailyPulls,
    };
  }

  /**
   * Obtiene el tiempo hasta la próxima tirada diaria
   */
  async getTimeUntilNextPull(playerId: string): Promise<number> {
    const status = await this.getDailyPullStatus(playerId);
    return status.timeUntilNextPull;
  }

  /**
   * Registra una tirada diaria reclamada
   */
  async claimDailyPull(playerId: string, session?: ClientSession): Promise<{
    success: boolean;
    newStreak: number;
    message: string;
  }> {
    const canClaim = await this.canClaimDailyPull(playerId, session);
    
    if (!canClaim) {
      const status = await this.getDailyPullStatus(playerId, session);
      const hoursLeft = Math.ceil(status.timeUntilNextPull / (1000 * 60 * 60));
      return {
        success: false,
        newStreak: status.currentStreak,
        message: `Ya reclamaste tu tirada diaria. Próxima en ${hoursLeft} horas.`,
      };
    }

    const now = new Date();
    const record = await this.dailyPullsCollection.findOne({ playerId }, { session });

    let newStreak = 1;
    if (record) {
      // Verificar si el streak continúa
      if (this.isYesterday(record.lastPullDate)) {
        newStreak = Math.min(record.streak + 1, DAILY_PULL_CONFIG.maxStreakBonus);
      }
    }

    await this.dailyPullsCollection.updateOne(
      { playerId },
      {
        $set: {
          lastPullDate: now,
          streak: newStreak,
          updatedAt: now,
        },
        $inc: {
          totalDailyPulls: 1,
        },
        $setOnInsert: {
          playerId,
          createdAt: now,
        },
      },
      { upsert: true, session }
    );

    let message = '¡Tirada diaria reclamada!';
    if (newStreak > 1) {
      message = `¡Tirada diaria reclamada! Racha de ${newStreak} días 🔥`;
    }

    return {
      success: true,
      newStreak,
      message,
    };
  }

  /**
   * Obtiene el bonus de streak (para futuras mejoras)
   */
  getStreakBonus(streak: number): { 
    extraPulls: number; 
    rarityBoost: number;
    description: string;
  } {
    if (!DAILY_PULL_CONFIG.streakBonusEnabled) {
      return { extraPulls: 0, rarityBoost: 0, description: '' };
    }

    // Bonus basado en streak
    // Día 1: Sin bonus
    // Día 3: +5% rareza
    // Día 5: +10% rareza
    // Día 7+: +15% rareza + tirada extra

    if (streak >= 7) {
      return {
        extraPulls: 1,
        rarityBoost: 0.15,
        description: '🔥 Racha de 7 días: +15% rareza + 1 tirada extra',
      };
    } else if (streak >= 5) {
      return {
        extraPulls: 0,
        rarityBoost: 0.10,
        description: '🔥 Racha de 5 días: +10% rareza',
      };
    } else if (streak >= 3) {
      return {
        extraPulls: 0,
        rarityBoost: 0.05,
        description: '🔥 Racha de 3 días: +5% rareza',
      };
    }

    return { extraPulls: 0, rarityBoost: 0, description: '' };
  }

  /**
   * Verifica si es un nuevo día (después del reset)
   */
  private isNewDay(lastPullDate: Date): boolean {
    const now = new Date();
    const lastReset = this.getLastResetTime();
    return lastPullDate < lastReset;
  }

  /**
   * Verifica si la fecha fue ayer
   */
  private isYesterday(date: Date): boolean {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(DAILY_PULL_CONFIG.resetHourUTC, 0, 0, 0);
    
    const dayBefore = new Date(yesterday);
    dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);

    return date >= dayBefore && date < yesterday;
  }

  /**
   * Obtiene la hora del último reset
   */
  private getLastResetTime(): Date {
    const now = new Date();
    const reset = new Date(now);
    reset.setUTCHours(DAILY_PULL_CONFIG.resetHourUTC, 0, 0, 0);
    
    if (reset > now) {
      reset.setUTCDate(reset.getUTCDate() - 1);
    }
    
    return reset;
  }

  /**
   * Obtiene la hora del próximo reset
   */
  private getNextResetTime(): Date {
    const now = new Date();
    const reset = new Date(now);
    reset.setUTCHours(DAILY_PULL_CONFIG.resetHourUTC, 0, 0, 0);
    
    if (reset <= now) {
      reset.setUTCDate(reset.getUTCDate() + 1);
    }
    
    return reset;
  }

  /**
   * Obtiene estadísticas globales de tiradas diarias
   */
  async getGlobalStats(): Promise<{
    totalPlayers: number;
    totalDailyPulls: number;
    averageStreak: number;
    maxStreak: number;
  }> {
    const pipeline = [
      {
        $group: {
          _id: null,
          totalPlayers: { $sum: 1 },
          totalDailyPulls: { $sum: '$totalDailyPulls' },
          averageStreak: { $avg: '$streak' },
          maxStreak: { $max: '$streak' },
        },
      },
    ];

    const result = await this.dailyPullsCollection.aggregate(pipeline).toArray();
    
    if (result.length === 0) {
      return {
        totalPlayers: 0,
        totalDailyPulls: 0,
        averageStreak: 0,
        maxStreak: 0,
      };
    }

    return {
      totalPlayers: result[0].totalPlayers,
      totalDailyPulls: result[0].totalDailyPulls,
      averageStreak: Math.round(result[0].averageStreak * 10) / 10,
      maxStreak: result[0].maxStreak,
    };
  }
}