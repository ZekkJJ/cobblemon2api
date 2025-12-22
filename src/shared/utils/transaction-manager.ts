/**
 * Transaction Manager - MongoDB Transaction Support
 * Cobblemon Los Pitufos - Backend API
 * 
 * Provides atomic transaction support for critical operations
 * to prevent race conditions and data corruption.
 */

import { MongoClient, ClientSession } from 'mongodb';
import { AppError, Errors } from '../middleware/error-handler.js';

export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class TransactionManager {
  constructor(private client: MongoClient) {}

  /**
   * Executes a function within a MongoDB transaction
   * Automatically handles commit/abort and retries on transient errors
   */
  async executeTransaction<T>(
    operation: (session: ClientSession) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const session = this.client.startSession();
      
      try {
        session.startTransaction({
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
          readPreference: 'primary'
        });

        const result = await operation(session);
        
        await session.commitTransaction();
        await session.endSession();
        
        return result;
      } catch (error: any) {
        await session.abortTransaction();
        await session.endSession();
        
        lastError = error;

        // Check if error is transient and we should retry
        if (this.isTransientError(error) && attempt < maxRetries) {
          console.warn(`[TRANSACTION] Transient error on attempt ${attempt}, retrying...`, error.message);
          await this.delay(Math.pow(2, attempt) * 100); // Exponential backoff
          continue;
        }

        // Non-transient error or max retries reached
        break;
      }
    }

    // If we get here, all retries failed
    console.error('[TRANSACTION] Transaction failed after all retries:', lastError);
    
    if (lastError instanceof AppError) {
      throw lastError;
    }
    
    throw Errors.databaseError();
  }

  /**
   * Checks if an error is transient and can be retried
   */
  private isTransientError(error: any): boolean {
    if (!error) return false;
    
    const transientErrorCodes = [
      112, // WriteConflict
      117, // ConflictingOperationInProgress
      251, // NoSuchTransaction
      262, // TransactionAborted
    ];

    const transientLabels = [
      'TransientTransactionError',
      'UnknownTransactionCommitResult'
    ];

    return (
      transientErrorCodes.includes(error.code) ||
      (error.errorLabels && error.errorLabels.some((label: string) => transientLabels.includes(label)))
    );
  }

  /**
   * Delays execution for the specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
