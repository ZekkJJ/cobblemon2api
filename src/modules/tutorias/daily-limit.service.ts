import { DailyUsageModel, ServiceType } from './tutorias.schema';
import { DailyLimitStatus } from '../../shared/types/tutorias.types';
import { PricingService } from './pricing.service';

export class DailyLimitService {
  private pricingService: PricingService;

  constructor() {
    this.pricingService = new PricingService();
  }

  /**
   * Check if user has exceeded daily limit for a service
   * Property 19: Daily Limit Enforcement
   */
  async checkDailyLimit(discordId: string, serviceType: ServiceType): Promise<DailyLimitStatus> {
    const today = this.getTodayDateString();
    const dailyLimit = await this.pricingService.getDailyLimit(serviceType);
    
    const usage = await DailyUsageModel.findOne({
      discordId,
      serviceType,
      date: today
    });

    const currentCount = usage?.count || 0;
    const remaining = Math.max(0, dailyLimit - currentCount);
    
    // Calculate when limit resets (midnight server time)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const resetsAt = tomorrow.toISOString();

    if (currentCount >= dailyLimit) {
      return {
        allowed: false,
        remaining: 0,
        resetsAt
      };
    }

    return {
      allowed: true,
      remaining,
      resetsAt
    };
  }

  /**
   * Increment usage count for a service
   */
  async incrementUsage(discordId: string, serviceType: ServiceType): Promise<number> {
    const today = this.getTodayDateString();
    
    const result = await DailyUsageModel.findOneAndUpdate(
      { discordId, serviceType, date: today },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );

    return result.count;
  }

  /**
   * Get current usage count for a service
   */
  async getUsageCount(discordId: string, serviceType: ServiceType): Promise<number> {
    const today = this.getTodayDateString();
    
    const usage = await DailyUsageModel.findOne({
      discordId,
      serviceType,
      date: today
    });

    return usage?.count || 0;
  }

  /**
   * Get all usage counts for a user today
   */
  async getAllUsageCounts(discordId: string): Promise<Record<string, number>> {
    const today = this.getTodayDateString();
    
    const usages = await DailyUsageModel.find({
      discordId,
      date: today
    });

    const result: Record<string, number> = {
      battleAnalysis: 0,
      aiTutor: 0,
      breedAdvisor: 0
    };

    for (const usage of usages) {
      const key = this.serviceTypeToKey(usage.serviceType);
      result[key] = usage.count;
    }

    return result;
  }

  /**
   * Reset daily limits (called at midnight)
   * Property 20: Daily Limit Reset - resets at midnight server time
   */
  async resetLimits(): Promise<number> {
    const today = this.getTodayDateString();
    
    // Delete all records from previous days
    const result = await DailyUsageModel.deleteMany({
      date: { $lt: today }
    });

    return result.deletedCount;
  }

  /**
   * Force reset limits for a specific user (admin)
   */
  async resetUserLimits(discordId: string): Promise<number> {
    const result = await DailyUsageModel.deleteMany({ discordId });
    return result.deletedCount;
  }

  /**
   * Get usage statistics for admin dashboard
   */
  async getUsageStats(): Promise<{
    totalRequestsToday: number;
    uniqueUsersToday: number;
    byService: Record<string, number>;
  }> {
    const today = this.getTodayDateString();
    
    const usages = await DailyUsageModel.find({ date: today });
    
    const uniqueUsers = new Set<string>();
    const byService: Record<string, number> = {
      battleAnalysis: 0,
      aiTutor: 0,
      breedAdvisor: 0
    };
    let totalRequests = 0;

    for (const usage of usages) {
      uniqueUsers.add(usage.discordId);
      totalRequests += usage.count;
      const key = this.serviceTypeToKey(usage.serviceType);
      byService[key] += usage.count;
    }

    return {
      totalRequestsToday: totalRequests,
      uniqueUsersToday: uniqueUsers.size,
      byService
    };
  }

  /**
   * Get today's date string in YYYY-MM-DD format
   */
  private getTodayDateString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * Convert ServiceType to camelCase key
   */
  private serviceTypeToKey(serviceType: ServiceType): string {
    switch (serviceType) {
      case 'BATTLE_ANALYSIS': return 'battleAnalysis';
      case 'AI_TUTOR': return 'aiTutor';
      case 'BREED_ADVISOR': return 'breedAdvisor';
      default: return serviceType.toLowerCase();
    }
  }
}
