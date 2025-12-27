import mongoose from 'mongoose';
import { BattleLogModel, IBattleLogDocument } from './tutorias.schema';
import { BattleLog, BattleSummary, BattleAnalysisResponse } from '../../shared/types/tutorias.types';
import { v4 as uuidv4 } from 'uuid';

export class BattleLogService {
  /**
   * Store a battle log from the plugin
   * Property 3: Battle Log Completeness - validates required fields
   * Property 4: Turn Record Completeness - validates turn data
   */
  async storeBattleLog(battleLog: Partial<BattleLog>): Promise<string> {
    // Validate required fields
    if (!battleLog.player1Uuid || !battleLog.player2Uuid) {
      throw new Error('Both player UUIDs are required');
    }
    if (!battleLog.turns || battleLog.turns.length === 0) {
      throw new Error('At least one turn is required');
    }
    if (!battleLog.winner) {
      throw new Error('Winner is required');
    }

    const battleId = battleLog.id || uuidv4();

    const document = await BattleLogModel.create({
      battleId,
      player1Uuid: battleLog.player1Uuid,
      player1Username: battleLog.player1Username || 'Unknown',
      player2Uuid: battleLog.player2Uuid,
      player2Username: battleLog.player2Username || 'Unknown',
      winner: battleLog.winner,
      result: battleLog.result || 'KO',
      startTime: battleLog.startTime ? new Date(battleLog.startTime) : new Date(),
      endTime: battleLog.endTime ? new Date(battleLog.endTime) : new Date(),
      duration: battleLog.duration || 0,
      turnCount: battleLog.turns.length,
      turns: battleLog.turns,
      initialState: battleLog.initialState || { player1Team: [], player2Team: [] },
      analyzed: false
    });

    return document.battleId;
  }

  /**
   * Get a battle log by ID
   */
  async getBattleLog(battleId: string): Promise<IBattleLogDocument | null> {
    return BattleLogModel.findOne({ battleId });
  }

  /**
   * Get battle history for a user
   * Property 5: Battle History Retrieval - returns all battles where user was participant
   */
  async getBattlesForUser(discordId: string): Promise<BattleSummary[]> {
    const db = mongoose.connection.db;
    if (!db) return [];

    // Get user's Minecraft UUID
    const user = await db.collection('users').findOne({ discordId });
    if (!user?.minecraftUuid) return [];

    const minecraftUuid = user.minecraftUuid;

    // Find all battles where user was a participant
    const battles = await BattleLogModel.find({
      $or: [
        { player1Uuid: minecraftUuid },
        { player2Uuid: minecraftUuid }
      ]
    }).sort({ createdAt: -1 }).limit(50);

    return battles.map(battle => {
      const isPlayer1 = battle.player1Uuid === minecraftUuid;
      const opponent = isPlayer1 ? battle.player2Username : battle.player1Username;
      const opponentUuid = isPlayer1 ? battle.player2Uuid : battle.player1Uuid;
      
      let result: 'WIN' | 'LOSS' | 'DRAW';
      if (battle.winner === minecraftUuid) {
        result = 'WIN';
      } else if (battle.winner === 'DRAW') {
        result = 'DRAW';
      } else {
        result = 'LOSS';
      }

      return {
        id: battle.battleId,
        date: battle.createdAt.toISOString(),
        opponent,
        opponentUuid,
        result,
        duration: battle.duration,
        turns: battle.turnCount,
        analyzed: battle.analyzed
      };
    });
  }

  /**
   * Save analysis result to battle log
   */
  async saveAnalysis(battleId: string, analysis: BattleAnalysisResponse): Promise<void> {
    await BattleLogModel.findOneAndUpdate(
      { battleId },
      {
        $set: {
          analyzed: true,
          analysisResult: analysis
        }
      }
    );
  }

  /**
   * Get battles that haven't been analyzed yet
   */
  async getUnanalyzedBattles(limit: number = 10): Promise<IBattleLogDocument[]> {
    return BattleLogModel.find({ analyzed: false })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Get battle statistics for a user
   */
  async getUserBattleStats(discordId: string): Promise<{
    totalBattles: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    averageTurns: number;
    averageDuration: number;
  }> {
    const db = mongoose.connection.db;
    if (!db) {
      return {
        totalBattles: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        averageTurns: 0,
        averageDuration: 0
      };
    }

    const user = await db.collection('users').findOne({ discordId });
    if (!user?.minecraftUuid) {
      return {
        totalBattles: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        averageTurns: 0,
        averageDuration: 0
      };
    }

    const minecraftUuid = user.minecraftUuid;

    const battles = await BattleLogModel.find({
      $or: [
        { player1Uuid: minecraftUuid },
        { player2Uuid: minecraftUuid }
      ]
    });

    let wins = 0;
    let losses = 0;
    let draws = 0;
    let totalTurns = 0;
    let totalDuration = 0;

    for (const battle of battles) {
      totalTurns += battle.turnCount;
      totalDuration += battle.duration;

      if (battle.winner === minecraftUuid) {
        wins++;
      } else if (battle.winner === 'DRAW') {
        draws++;
      } else {
        losses++;
      }
    }

    const totalBattles = battles.length;
    const winRate = totalBattles > 0 ? (wins / totalBattles) * 100 : 0;
    const averageTurns = totalBattles > 0 ? totalTurns / totalBattles : 0;
    const averageDuration = totalBattles > 0 ? totalDuration / totalBattles : 0;

    return {
      totalBattles,
      wins,
      losses,
      draws,
      winRate: Math.round(winRate * 100) / 100,
      averageTurns: Math.round(averageTurns * 10) / 10,
      averageDuration: Math.round(averageDuration)
    };
  }

  /**
   * Delete old battle logs (cleanup job)
   */
  async deleteOldBattleLogs(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await BattleLogModel.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    return result.deletedCount;
  }

  /**
   * Get recent battles for leaderboard/stats
   */
  async getRecentBattles(limit: number = 20): Promise<IBattleLogDocument[]> {
    return BattleLogModel.find({})
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}
