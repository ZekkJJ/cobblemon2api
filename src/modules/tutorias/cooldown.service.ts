import { CooldownModel, ServiceType, DailyUsageModel } from './tutorias.schema';
import { CooldownStatus, ServiceCooldowns } from '../../shared/types/tutorias.types';
import { PricingService } from './pricing.service';

export class CooldownService {
  private pricingService: PricingService;

  constructor() {
    this.pricingService = new PricingService();
  }

  /**
   * Check if user can make a request (cooldown expired)
   * Property 6: Cooldown Enforcement - requests within cooldown period are rejected
   * Property 7: Cooldown Expiration - requests after expiration are allowed
   */
  async checkCooldown(discordId: string, serviceType: ServiceType): Promise<CooldownStatus> {
    const cooldown = await CooldownModel.findOne({ discordId, serviceType });
    
    if (!cooldown) {
      // No cooldown record = allowed
      return { allowed: true };
    }

    const now = Date.now();
    const expiresAt = cooldown.expiresAt.getTime();

    if (now >= expiresAt) {
      // Cooldown expired = allowed
      return { allowed: true };
    }

    // Still in cooldown = not allowed
    return {
      allowed: false,
      remainingMs: expiresAt - now,
      expiresAt
    };
  }

  /**
   * Record a request and set cooldown
   * Property 8: Independent Service Cooldowns - each service has its own cooldown
   */
  async recordRequest(discordId: string, serviceType: ServiceType): Promise<void> {
    const cooldownMinutes = await this.pricingService.getCooldownMinutes(serviceType);
    
    // Apply progressive cooldown based on daily usage
    const progressiveMultiplier = await this.getProgressiveCooldownMultiplier(discordId, serviceType);
    const actualCooldownMinutes = cooldownMinutes * progressiveMultiplier;
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + actualCooldownMinutes * 60 * 1000);

    await CooldownModel.findOneAndUpdate(
      { discordId, serviceType },
      {
        $set: {
          lastRequest: now,
          expiresAt
        }
      },
      { upsert: true }
    );
  }

  /**
   * Get all cooldowns for a user
   */
  async getCooldowns(discordId: string): Promise<ServiceCooldowns> {
    const cooldowns = await CooldownModel.find({ discordId });
    
    const result: ServiceCooldowns = {
      battleAnalysis: null,
      aiTutor: null,
      breedAdvisor: null
    };

    const now = Date.now();

    for (const cooldown of cooldowns) {
      const expiresAt = cooldown.expiresAt.getTime();
      
      // Only include if not expired
      if (expiresAt > now) {
        const key = this.serviceTypeToKey(cooldown.serviceType);
        (result as any)[key] = expiresAt;
      }
    }

    return result;
  }

  /**
   * Get progressive cooldown multiplier based on usage
   * Property 21: Progressive Cooldown Scaling
   * 1-3 uses: 1x, 4-6 uses: 2x, 7-9 uses: 4x, 10+ uses: 8x
   */
  async getProgressiveCooldownMultiplier(discordId: string, serviceType: ServiceType): Promise<number> {
    const today = this.getTodayDateString();
    
    const usage = await DailyUsageModel.findOne({
      discordId,
      serviceType,
      date: today
    });

    const count = usage?.count || 0;

    if (count >= 10) return 8;
    if (count >= 7) return 4;
    if (count >= 4) return 2;
    return 1;
  }

  /**
   * Clear expired cooldowns (cleanup job)
   */
  async clearExpiredCooldowns(): Promise<number> {
    const result = await CooldownModel.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    return result.deletedCount;
  }

  /**
   * Get remaining cooldown time in milliseconds
   */
  async getRemainingCooldown(discordId: string, serviceType: ServiceType): Promise<number> {
    const status = await this.checkCooldown(discordId, serviceType);
    return status.remainingMs || 0;
  }

  /**
   * Force clear cooldown for a user (admin)
   */
  async clearCooldown(discordId: string, serviceType: ServiceType): Promise<boolean> {
    const result = await CooldownModel.deleteOne({ discordId, serviceType });
    return result.deletedCount > 0;
  }

  /**
   * Clear all cooldowns for a user (admin)
   */
  async clearAllCooldowns(discordId: string): Promise<number> {
    const result = await CooldownModel.deleteMany({ discordId });
    return result.deletedCount;
  }

  /**
   * Convert ServiceType to camelCase key
   */
  private serviceTypeToKey(serviceType: ServiceType): keyof ServiceCooldowns {
    switch (serviceType) {
      case 'BATTLE_ANALYSIS': return 'battleAnalysis';
      case 'AI_TUTOR': return 'aiTutor';
      case 'BREED_ADVISOR': return 'breedAdvisor';
      default: return 'battleAnalysis';
    }
  }

  /**
   * Get today's date string in YYYY-MM-DD format
   */
  private getTodayDateString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }
}
