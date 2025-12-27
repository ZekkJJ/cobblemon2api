import mongoose from 'mongoose';
import crypto from 'crypto';
import { 
  TransactionLedgerModel, 
  PendingSyncModel, 
  SuspiciousActivityModel,
  ServiceType 
} from './tutorias.schema';
import { 
  ValidationResult, 
  LedgerVerification, 
  BalanceTransaction,
  TransactionSource 
} from '../../shared/types/tutorias.types';

export class BalanceIntegrityService {
  private secretKey: string;
  private maxHourlyIncrease: number = 50000;
  private maxSingleIncrease: number = 10000;
  private replayWindowMs: number = 5 * 60 * 1000; // 5 minutes
  private usedNonces: Map<string, number> = new Map();

  constructor() {
    this.secretKey = process.env.TUTORIAS_SECRET_KEY || 'default-secret-key-change-in-production';
    
    // Clean up old nonces periodically
    setInterval(() => this.cleanupNonces(), 60000);
  }

  /**
   * Validate incoming balance sync from plugin
   * Property 19: Signed Request Validation - reject invalid signatures
   * Property 20: Balance Jump Detection - reject impossible balance jumps
   * Property 22: Replay Attack Prevention - reject old timestamps/used nonces
   */
  async validatePluginSync(
    uuid: string,
    reportedBalance: number,
    signature: string,
    timestamp: number,
    nonce: string
  ): Promise<ValidationResult> {
    // 1. Check for replay attacks
    const now = Date.now();
    if (now - timestamp > this.replayWindowMs) {
      await this.flagSuspiciousActivity(uuid, 'REPLAY_ATTACK_ATTEMPT', {
        timestamp,
        now,
        difference: now - timestamp
      }, 'HIGH');
      return { valid: false, reason: 'TIMESTAMP_EXPIRED' };
    }

    // Check nonce
    const nonceKey = `${uuid}:${nonce}`;
    if (this.usedNonces.has(nonceKey)) {
      await this.flagSuspiciousActivity(uuid, 'REPLAY_ATTACK_ATTEMPT', {
        nonce,
        previousUse: this.usedNonces.get(nonceKey)
      }, 'HIGH');
      return { valid: false, reason: 'NONCE_REUSED' };
    }
    this.usedNonces.set(nonceKey, now);

    // 2. Verify HMAC signature
    const expectedSignature = this.generateSignature(uuid, reportedBalance, timestamp, nonce);
    if (signature !== expectedSignature) {
      await this.flagSuspiciousActivity(uuid, 'INVALID_SIGNATURE', {
        expected: expectedSignature.substring(0, 10) + '...',
        received: signature.substring(0, 10) + '...'
      }, 'CRITICAL');
      return { valid: false, reason: 'SIGNATURE_MISMATCH' };
    }

    // 3. Check for impossible balance jumps
    const currentBalance = await this.getCurrentBalance(uuid);
    const maxAllowedIncrease = await this.getMaxAllowedIncrease(uuid);

    if (reportedBalance > currentBalance + maxAllowedIncrease) {
      await this.flagSuspiciousActivity(uuid, 'IMPOSSIBLE_BALANCE_JUMP', {
        current: currentBalance,
        reported: reportedBalance,
        maxAllowed: maxAllowedIncrease,
        difference: reportedBalance - currentBalance
      }, 'CRITICAL');
      return { valid: false, reason: 'BALANCE_JUMP_TOO_LARGE' };
    }

    // 4. Rate limit balance increases
    const recentIncreases = await this.getRecentIncreases(uuid, 60); // Last hour
    if (recentIncreases > this.maxHourlyIncrease) {
      await this.flagSuspiciousActivity(uuid, 'RATE_LIMIT_EXCEEDED', {
        recentIncreases,
        maxAllowed: this.maxHourlyIncrease
      }, 'MEDIUM');
      return { valid: false, reason: 'RATE_LIMIT' };
    }

    return { valid: true };
  }

  /**
   * Record a debit transaction
   * Property 18: Transaction Ledger Integrity
   */
  async debit(
    discordId: string,
    amount: number,
    source: TransactionSource,
    sourceId?: string
  ): Promise<{ success: boolean; newBalance: number }> {
    const db = mongoose.connection.db;
    if (!db) return { success: false, newBalance: 0 };

    const user = await db.collection('users').findOne({ discordId });
    if (!user) return { success: false, newBalance: 0 };

    const currentBalance = user.balance || 0;
    if (currentBalance < amount) {
      return { success: false, newBalance: currentBalance };
    }

    const newBalance = currentBalance - amount;

    // Update balance
    await db.collection('users').updateOne(
      { discordId },
      { $set: { balance: newBalance } }
    );

    // Record in ledger
    const signature = this.generateTransactionSignature(discordId, 'DEBIT', amount, currentBalance, newBalance);
    await TransactionLedgerModel.create({
      discordId,
      minecraftUuid: user.minecraftUuid,
      type: 'DEBIT',
      amount,
      source,
      sourceId,
      previousBalance: currentBalance,
      newBalance,
      signature
    });

    return { success: true, newBalance };
  }

  /**
   * Record a credit transaction
   */
  async credit(
    discordId: string,
    amount: number,
    source: TransactionSource,
    sourceId?: string
  ): Promise<{ success: boolean; newBalance: number }> {
    const db = mongoose.connection.db;
    if (!db) return { success: false, newBalance: 0 };

    const user = await db.collection('users').findOne({ discordId });
    if (!user) return { success: false, newBalance: 0 };

    const currentBalance = user.balance || 0;
    const newBalance = currentBalance + amount;

    // Update balance
    await db.collection('users').updateOne(
      { discordId },
      { $set: { balance: newBalance } }
    );

    // Record in ledger
    const signature = this.generateTransactionSignature(discordId, 'CREDIT', amount, currentBalance, newBalance);
    await TransactionLedgerModel.create({
      discordId,
      minecraftUuid: user.minecraftUuid,
      type: 'CREDIT',
      amount,
      source,
      sourceId,
      previousBalance: currentBalance,
      newBalance,
      signature
    });

    return { success: true, newBalance };
  }

  /**
   * Verify ledger integrity for a user
   * Property 18: Transaction Ledger Integrity - sum of transactions equals balance
   */
  async verifyUserLedger(discordId: string): Promise<LedgerVerification> {
    const db = mongoose.connection.db;
    if (!db) {
      return { valid: false, currentBalance: 0, calculatedBalance: 0, suspiciousTransactions: [] };
    }

    const user = await db.collection('users').findOne({ discordId });
    const currentBalance = user?.balance || 0;

    const transactions = await TransactionLedgerModel.find({ discordId }).sort({ timestamp: 1 });

    let calculatedBalance = 0;
    const suspiciousTransactions: string[] = [];

    for (const tx of transactions) {
      // Verify signature
      const expectedSignature = this.generateTransactionSignature(
        tx.discordId,
        tx.type,
        tx.amount,
        tx.previousBalance,
        tx.newBalance
      );

      if (tx.signature !== expectedSignature) {
        suspiciousTransactions.push(tx._id.toString());
      }

      // Calculate balance
      if (tx.type === 'CREDIT') {
        calculatedBalance += tx.amount;
      } else {
        calculatedBalance -= tx.amount;
      }
    }

    const discrepancy = Math.abs(currentBalance - calculatedBalance);
    const valid = discrepancy === 0 && suspiciousTransactions.length === 0;

    if (!valid && discrepancy > 0) {
      await this.flagSuspiciousActivity(discordId, 'LEDGER_DISCREPANCY', {
        currentBalance,
        calculatedBalance,
        discrepancy
      }, 'HIGH');
    }

    return {
      valid,
      currentBalance,
      calculatedBalance,
      discrepancy: discrepancy > 0 ? discrepancy : undefined,
      suspiciousTransactions
    };
  }

  /**
   * Get user's transaction ledger
   */
  async getUserLedger(discordId: string, limit: number = 100): Promise<any[]> {
    return TransactionLedgerModel.find({ discordId })
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  /**
   * Get pending syncs for a Minecraft player
   */
  async getPendingSyncs(minecraftUuid: string): Promise<any[]> {
    return PendingSyncModel.find({
      minecraftUuid,
      status: 'PENDING'
    }).sort({ createdAt: 1 });
  }

  /**
   * Create a pending sync for offline player
   * Property 18: Pending Sync Creation
   */
  async createPendingSync(
    discordId: string,
    minecraftUuid: string,
    amount: number,
    serviceType: ServiceType,
    serviceId: string
  ): Promise<string> {
    const sync = await PendingSyncModel.create({
      discordId,
      minecraftUuid,
      amount,
      serviceType,
      serviceId,
      status: 'PENDING'
    });

    return sync._id.toString();
  }

  /**
   * Confirm a sync was processed
   */
  async confirmSync(syncId: string, success: boolean, error?: string): Promise<void> {
    await PendingSyncModel.findByIdAndUpdate(syncId, {
      $set: {
        status: success ? 'COMPLETED' : 'FAILED',
        processedAt: new Date(),
        error
      }
    });
  }

  /**
   * Flag suspicious activity
   */
  private async flagSuspiciousActivity(
    identifier: string,
    activityType: string,
    details: Record<string, any>,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ): Promise<void> {
    // Determine if identifier is discordId or minecraftUuid
    const isUuid = identifier.includes('-');
    
    await SuspiciousActivityModel.create({
      discordId: isUuid ? undefined : identifier,
      minecraftUuid: isUuid ? identifier : undefined,
      activityType,
      details,
      severity
    });

    console.warn(`[SUSPICIOUS ACTIVITY] ${severity}: ${activityType} for ${identifier}`, details);
  }

  /**
   * Get current balance for a Minecraft UUID
   */
  private async getCurrentBalance(minecraftUuid: string): Promise<number> {
    const db = mongoose.connection.db;
    if (!db) return 0;

    const user = await db.collection('users').findOne({ minecraftUuid });
    return user?.balance || 0;
  }

  /**
   * Get max allowed balance increase based on player activity
   */
  private async getMaxAllowedIncrease(minecraftUuid: string): Promise<number> {
    // Base: 10,000 per sync
    // Could add bonuses for legitimate activities
    return this.maxSingleIncrease;
  }

  /**
   * Get recent balance increases in the last N minutes
   */
  private async getRecentIncreases(minecraftUuid: string, minutes: number): Promise<number> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    
    const transactions = await TransactionLedgerModel.find({
      minecraftUuid,
      type: 'CREDIT',
      timestamp: { $gte: cutoff }
    });

    return transactions.reduce((sum, tx) => sum + tx.amount, 0);
  }

  /**
   * Generate HMAC signature for plugin sync validation
   */
  private generateSignature(uuid: string, balance: number, timestamp: number, nonce: string): string {
    const data = `${uuid}:${balance}:${timestamp}:${nonce}`;
    return crypto.createHmac('sha256', this.secretKey).update(data).digest('hex');
  }

  /**
   * Generate signature for transaction integrity
   */
  private generateTransactionSignature(
    discordId: string,
    type: string,
    amount: number,
    previousBalance: number,
    newBalance: number
  ): string {
    const data = `${discordId}:${type}:${amount}:${previousBalance}:${newBalance}`;
    return crypto.createHmac('sha256', this.secretKey).update(data).digest('hex');
  }

  /**
   * Clean up old nonces
   */
  private cleanupNonces(): void {
    const cutoff = Date.now() - this.replayWindowMs;
    for (const [key, timestamp] of this.usedNonces) {
      if (timestamp < cutoff) {
        this.usedNonces.delete(key);
      }
    }
  }
}
