import mongoose from 'mongoose';
import { SuspiciousActivityModel, ISuspiciousActivityDocument, SuspiciousActivityType } from './tutorias.schema';

export class SuspiciousActivityService {
  /**
   * Flag a suspicious activity
   */
  async flagActivity(
    discordId: string,
    activityType: SuspiciousActivityType,
    details: Record<string, any>,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    minecraftUuid?: string
  ): Promise<ISuspiciousActivityDocument> {
    const activity = await SuspiciousActivityModel.create({
      discordId,
      minecraftUuid,
      activityType,
      details,
      severity
    });

    // Auto-process based on severity
    await this.processFlag(activity);

    return activity;
  }

  /**
   * Get suspicious activities with filters
   */
  async getActivities(filters: {
    resolved?: boolean;
    severity?: string;
    limit?: number;
    discordId?: string;
  }): Promise<ISuspiciousActivityDocument[]> {
    const query: any = {};

    if (filters.resolved !== undefined) {
      query.resolved = filters.resolved;
    }
    if (filters.severity) {
      query.severity = filters.severity;
    }
    if (filters.discordId) {
      query.discordId = filters.discordId;
    }

    return SuspiciousActivityModel.find(query)
      .sort({ timestamp: -1 })
      .limit(filters.limit || 50);
  }

  /**
   * Resolve a suspicious activity
   */
  async resolveActivity(
    activityId: string,
    resolvedBy: string,
    action?: 'WARNED' | 'TEMP_BAN' | 'PERM_BAN' | 'BALANCE_RESET'
  ): Promise<void> {
    await SuspiciousActivityModel.findByIdAndUpdate(activityId, {
      $set: {
        resolved: true,
        resolvedBy,
        resolvedAt: new Date(),
        action
      }
    });

    // Execute action if specified
    if (action) {
      const activity = await SuspiciousActivityModel.findById(activityId);
      if (activity) {
        await this.executeAction(activity.discordId, action);
      }
    }
  }

  /**
   * Get flags for a specific user
   */
  async getUserFlags(discordId: string, days: number = 7): Promise<ISuspiciousActivityDocument[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return SuspiciousActivityModel.find({
      discordId,
      timestamp: { $gte: cutoff }
    }).sort({ timestamp: -1 });
  }

  /**
   * Get abuse statistics
   */
  async getStats(): Promise<{
    totalFlags: number;
    unresolvedFlags: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    recentFlags: number;
    topOffenders: { discordId: string; count: number }[];
  }> {
    const totalFlags = await SuspiciousActivityModel.countDocuments();
    const unresolvedFlags = await SuspiciousActivityModel.countDocuments({ resolved: false });

    // Last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recentFlags = await SuspiciousActivityModel.countDocuments({
      timestamp: { $gte: yesterday }
    });

    // By severity
    const severityAgg = await SuspiciousActivityModel.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);
    const bySeverity: Record<string, number> = {};
    for (const item of severityAgg) {
      bySeverity[item._id] = item.count;
    }

    // By type
    const typeAgg = await SuspiciousActivityModel.aggregate([
      { $group: { _id: '$activityType', count: { $sum: 1 } } }
    ]);
    const byType: Record<string, number> = {};
    for (const item of typeAgg) {
      byType[item._id] = item.count;
    }

    // Top offenders
    const offendersAgg = await SuspiciousActivityModel.aggregate([
      { $match: { discordId: { $exists: true, $ne: null } } },
      { $group: { _id: '$discordId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    const topOffenders = offendersAgg.map(item => ({
      discordId: item._id,
      count: item.count
    }));

    return {
      totalFlags,
      unresolvedFlags,
      bySeverity,
      byType,
      recentFlags,
      topOffenders
    };
  }

  /**
   * Auto-process a flag based on severity and history
   */
  private async processFlag(flag: ISuspiciousActivityDocument): Promise<void> {
    if (!flag.discordId) return;

    const userFlags = await this.getUserFlags(flag.discordId, 7);

    // Escalating responses
    if (flag.severity === 'CRITICAL') {
      await this.tempBanUser(flag.discordId, 24 * 60, 'Actividad sospechosa crítica detectada');
      await this.notifyAdmins(flag);
    } else if (userFlags.filter(f => f.severity === 'HIGH').length >= 3) {
      await this.tempBanUser(flag.discordId, 60, 'Múltiples actividades sospechosas de alta severidad');
    } else if (userFlags.length >= 5) {
      await this.warnUser(flag.discordId, 'Se ha detectado actividad inusual en tu cuenta');
    }
  }

  /**
   * Execute an action on a user
   */
  private async executeAction(
    discordId: string,
    action: 'WARNED' | 'TEMP_BAN' | 'PERM_BAN' | 'BALANCE_RESET'
  ): Promise<void> {
    const db = mongoose.connection.db;
    if (!db) return;

    switch (action) {
      case 'WARNED':
        // Just log the warning
        console.log(`[MODERATION] User ${discordId} warned`);
        break;

      case 'TEMP_BAN':
        await db.collection('users').updateOne(
          { discordId },
          { 
            $set: { 
              tutoriasBanned: true,
              tutoriasBanExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
            } 
          }
        );
        console.log(`[MODERATION] User ${discordId} temp banned from Tutorías`);
        break;

      case 'PERM_BAN':
        await db.collection('users').updateOne(
          { discordId },
          { $set: { tutoriasBanned: true, tutoriasBanExpires: null } }
        );
        console.log(`[MODERATION] User ${discordId} permanently banned from Tutorías`);
        break;

      case 'BALANCE_RESET':
        await db.collection('users').updateOne(
          { discordId },
          { $set: { balance: 0 } }
        );
        console.log(`[MODERATION] User ${discordId} balance reset to 0`);
        break;
    }
  }

  /**
   * Temporarily ban a user from Tutorías
   */
  private async tempBanUser(discordId: string, minutes: number, reason: string): Promise<void> {
    const db = mongoose.connection.db;
    if (!db) return;

    const banExpires = new Date(Date.now() + minutes * 60 * 1000);

    await db.collection('users').updateOne(
      { discordId },
      { 
        $set: { 
          tutoriasBanned: true,
          tutoriasBanExpires: banExpires,
          tutoriasBanReason: reason
        } 
      }
    );

    console.log(`[MODERATION] User ${discordId} temp banned for ${minutes} minutes: ${reason}`);
  }

  /**
   * Warn a user
   */
  private async warnUser(discordId: string, message: string): Promise<void> {
    const db = mongoose.connection.db;
    if (!db) return;

    await db.collection('users').updateOne(
      { discordId },
      { 
        $push: { 
          tutoriasWarnings: {
            message,
            timestamp: new Date()
          }
        } as any
      }
    );

    console.log(`[MODERATION] User ${discordId} warned: ${message}`);
  }

  /**
   * Notify admins of critical activity
   */
  private async notifyAdmins(flag: ISuspiciousActivityDocument): Promise<void> {
    // This would integrate with Discord webhook or other notification system
    console.error(`[CRITICAL ALERT] Suspicious activity detected:`, {
      discordId: flag.discordId,
      type: flag.activityType,
      severity: flag.severity,
      details: flag.details
    });

    // Could send Discord webhook here
    // await sendDiscordWebhook({ ... });
  }

  /**
   * Check if user is banned from Tutorías
   */
  async isUserBanned(discordId: string): Promise<{ banned: boolean; reason?: string; expiresAt?: Date }> {
    const db = mongoose.connection.db;
    if (!db) return { banned: false };

    const user = await db.collection('users').findOne({ discordId });
    if (!user?.tutoriasBanned) return { banned: false };

    // Check if temp ban expired
    if (user.tutoriasBanExpires && new Date(user.tutoriasBanExpires) < new Date()) {
      // Unban user
      await db.collection('users').updateOne(
        { discordId },
        { $unset: { tutoriasBanned: '', tutoriasBanExpires: '', tutoriasBanReason: '' } }
      );
      return { banned: false };
    }

    return {
      banned: true,
      reason: user.tutoriasBanReason,
      expiresAt: user.tutoriasBanExpires
    };
  }

  /**
   * Clean up old resolved flags
   */
  async cleanupOldFlags(daysOld: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const result = await SuspiciousActivityModel.deleteMany({
      resolved: true,
      timestamp: { $lt: cutoff }
    });

    return result.deletedCount;
  }
}
