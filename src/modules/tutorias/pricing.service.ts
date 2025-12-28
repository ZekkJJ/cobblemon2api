import mongoose from 'mongoose';
import { PricingModel, ServiceType, TransactionLedgerModel } from './tutorias.schema';
import { ChargeResult, ServicePricing } from '../../shared/types/tutorias.types';
import crypto from 'crypto';

// Default pricing configuration
const DEFAULT_PRICING: Record<ServiceType, { price: number; cooldownMinutes: number; dailyLimit: number }> = {
  'BATTLE_ANALYSIS': { price: 500, cooldownMinutes: 30, dailyLimit: 5 },
  'AI_TUTOR': { price: 200, cooldownMinutes: 15, dailyLimit: 10 },
  'BREED_ADVISOR': { price: 300, cooldownMinutes: 20, dailyLimit: 8 }
};

export class PricingService {
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.TUTORIAS_SECRET_KEY || 'default-secret-key-change-in-production';
  }

  /**
   * Initialize default pricing if not exists
   */
  async initializeDefaultPricing(): Promise<void> {
    for (const [serviceType, config] of Object.entries(DEFAULT_PRICING)) {
      const existing = await PricingModel.findOne({ serviceType });
      if (!existing) {
        await PricingModel.create({
          serviceType,
          price: config.price,
          cooldownMinutes: config.cooldownMinutes,
          dailyLimit: config.dailyLimit,
          updatedBy: 'SYSTEM'
        });
      }
    }
  }

  /**
   * Get price for a specific service
   */
  async getPrice(serviceType: ServiceType): Promise<number> {
    const pricing = await PricingModel.findOne({ serviceType });
    if (!pricing) {
      // Return default if not configured
      return DEFAULT_PRICING[serviceType]?.price || 0;
    }
    return pricing.price;
  }

  /**
   * Get all service prices
   */
  async getAllPrices(): Promise<ServicePricing & { cooldowns: Record<string, number>; dailyLimits: Record<string, number> }> {
    await this.initializeDefaultPricing();
    
    const pricings = await PricingModel.find({});
    
    const result: any = {
      battleAnalysis: DEFAULT_PRICING['BATTLE_ANALYSIS'].price,
      aiTutor: DEFAULT_PRICING['AI_TUTOR'].price,
      breedAdvisor: DEFAULT_PRICING['BREED_ADVISOR'].price,
      cooldowns: {
        battleAnalysis: DEFAULT_PRICING['BATTLE_ANALYSIS'].cooldownMinutes,
        aiTutor: DEFAULT_PRICING['AI_TUTOR'].cooldownMinutes,
        breedAdvisor: DEFAULT_PRICING['BREED_ADVISOR'].cooldownMinutes
      },
      dailyLimits: {
        battleAnalysis: DEFAULT_PRICING['BATTLE_ANALYSIS'].dailyLimit,
        aiTutor: DEFAULT_PRICING['AI_TUTOR'].dailyLimit,
        breedAdvisor: DEFAULT_PRICING['BREED_ADVISOR'].dailyLimit
      }
    };

    for (const pricing of pricings) {
      const key = this.serviceTypeToKey(pricing.serviceType);
      result[key] = pricing.price;
      result.cooldowns[key] = pricing.cooldownMinutes;
      result.dailyLimits[key] = pricing.dailyLimit;
    }

    return result;
  }

  /**
   * Update price for a service (admin only)
   */
  async updatePrice(
    serviceType: ServiceType, 
    updates: { price?: number; cooldownMinutes?: number; dailyLimit?: number; updatedBy: string }
  ): Promise<void> {
    const updateData: any = { updatedAt: new Date(), updatedBy: updates.updatedBy };
    
    if (updates.price !== undefined) {
      updateData.price = updates.price;
    }
    if (updates.cooldownMinutes !== undefined) {
      updateData.cooldownMinutes = updates.cooldownMinutes;
    }
    if (updates.dailyLimit !== undefined) {
      updateData.dailyLimit = updates.dailyLimit;
    }

    await PricingModel.findOneAndUpdate(
      { serviceType },
      { $set: updateData },
      { upsert: true }
    );
  }

  /**
   * Charge user for a service
   * Returns success/failure with new balance or error
   */
  async chargeUser(discordId: string, serviceType: ServiceType): Promise<ChargeResult> {
    const db = mongoose.connection.db;
    if (!db) {
      return { success: false, error: 'INSUFFICIENT_BALANCE', requiredAmount: 0 };
    }

    const price = await this.getPrice(serviceType);
    
    // Get user's current balance
    const user = await db.collection('users').findOne({ discordId });
    if (!user) {
      return { success: false, error: 'INSUFFICIENT_BALANCE', requiredAmount: price };
    }

    const currentBalance = user.balance || 0;
    
    if (currentBalance < price) {
      return { 
        success: false, 
        error: 'INSUFFICIENT_BALANCE', 
        requiredAmount: price 
      };
    }

    const newBalance = currentBalance - price;

    // Update balance
    await db.collection('users').updateOne(
      { discordId },
      { $set: { balance: newBalance } }
    );

    // Record transaction in ledger
    await this.recordTransaction(discordId, user.minecraftUuid, 'DEBIT', price, 'SERVICE_CHARGE', serviceType, currentBalance, newBalance);

    return { 
      success: true, 
      newBalance,
      chargedAmount: price
    };
  }

  /**
   * Refund user for a failed service
   */
  async refundUser(discordId: string, serviceType: ServiceType): Promise<boolean> {
    const db = mongoose.connection.db;
    if (!db) return false;

    const price = await this.getPrice(serviceType);
    
    const user = await db.collection('users').findOne({ discordId });
    if (!user) return false;

    const currentBalance = user.balance || 0;
    const newBalance = currentBalance + price;

    await db.collection('users').updateOne(
      { discordId },
      { $set: { balance: newBalance } }
    );

    // Record refund in ledger
    await this.recordTransaction(discordId, user.minecraftUuid, 'CREDIT', price, 'REFUND', serviceType, currentBalance, newBalance);

    return true;
  }

  /**
   * Record a transaction in the ledger for audit trail
   */
  private async recordTransaction(
    discordId: string,
    minecraftUuid: string | undefined,
    type: 'CREDIT' | 'DEBIT',
    amount: number,
    source: string,
    sourceId: string,
    previousBalance: number,
    newBalance: number
  ): Promise<void> {
    const signature = this.generateSignature(discordId, type, amount, previousBalance, newBalance);
    
    await TransactionLedgerModel.create({
      discordId,
      minecraftUuid,
      type,
      amount,
      source,
      sourceId,
      previousBalance,
      newBalance,
      signature
    });
  }

  /**
   * Generate HMAC signature for transaction integrity
   */
  private generateSignature(
    discordId: string,
    type: string,
    amount: number,
    previousBalance: number,
    newBalance: number
  ): string {
    const data = `${discordId}:${type}:${amount}:${previousBalance}:${newBalance}:${Date.now()}`;
    return crypto.createHmac('sha256', this.secretKey).update(data).digest('hex');
  }

  /**
   * Get cooldown minutes for a service
   */
  async getCooldownMinutes(serviceType: ServiceType): Promise<number> {
    const pricing = await PricingModel.findOne({ serviceType });
    if (!pricing) {
      return DEFAULT_PRICING[serviceType]?.cooldownMinutes || 15;
    }
    return pricing.cooldownMinutes;
  }

  /**
   * Get daily limit for a service
   */
  async getDailyLimit(serviceType: ServiceType): Promise<number> {
    const pricing = await PricingModel.findOne({ serviceType });
    if (!pricing) {
      return DEFAULT_PRICING[serviceType]?.dailyLimit || 10;
    }
    return pricing.dailyLimit;
  }

  /**
   * Convert ServiceType to camelCase key
   */
  private serviceTypeToKey(serviceType: ServiceType): string {
    switch (serviceType) {
      case 'BATTLE_ANALYSIS': return 'battleAnalysis';
      case 'AI_TUTOR': return 'aiTutor';
      case 'BREED_ADVISOR': return 'breedAdvisor';
    }
  }
}
