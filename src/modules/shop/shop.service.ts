/**
 * Servicio de Tienda
 * Cobblemon Los Pitufos - Backend API
 */

import { Collection, ClientSession } from 'mongodb';
import { User } from '../../shared/types/user.types.js';
import { ShopStock, ShopPurchase, BallStock, PurchaseItem } from '../../shared/types/shop.types.js';
import { POKEBALLS, getRandomStock, getPriceWithStock } from '../../shared/data/pokeballs.data.js';
import { AppError, Errors } from '../../shared/middleware/error-handler.js';
import { TransactionManager } from '../../shared/utils/transaction-manager.js';

const STOCK_REFRESH_INTERVAL = 3600000; // 1 hora

export class ShopService {
  constructor(
    private usersCollection: Collection<User>,
    private shopStockCollection: Collection<ShopStock>,
    private shopPurchasesCollection: Collection<ShopPurchase>,
    private transactionManager: TransactionManager
  ) {}

  async getStock(): Promise<{ balls: any[]; nextRefresh: number }> {
    try {
      let stockData = await this.shopStockCollection.findOne({ id: 'current' });

      if (!stockData || Date.now() - stockData.lastRefresh > STOCK_REFRESH_INTERVAL) {
        const newStocks = this.generateStocks();
        const timestamp = Date.now();

        await this.shopStockCollection.updateOne(
          { id: 'current' },
          {
            $set: {
              id: 'current',
              stocks: newStocks,
              lastRefresh: timestamp,
            },
          },
          { upsert: true }
        );

        stockData = await this.shopStockCollection.findOne({ id: 'current' });
      }

      if (!stockData) {
        throw new Error('Error generando stock');
      }

      const ballsWithStock = POKEBALLS.filter(ball => stockData!.stocks[ball.id]).map(ball => {
        const stock = stockData!.stocks[ball.id];
        return {
          ...ball,
          currentStock: stock?.stock || 0,
          currentPrice: stock?.price || ball.basePrice,
        };
      });

      return {
        balls: ballsWithStock,
        nextRefresh: stockData.lastRefresh + STOCK_REFRESH_INTERVAL,
      };
    } catch (error) {
      console.error('[SHOP SERVICE] Error obteniendo stock:', error);
      throw Errors.databaseError();
    }
  }

  private generateStocks(): Record<string, BallStock> {
    const stocks: Record<string, BallStock> = {};
    const now = Date.now();

    const basicBalls = POKEBALLS.filter(b => b.type === 'standard');
    const specialBalls = POKEBALLS.filter(b => b.type === 'special' && b.id !== 'master_ball');
    const shuffled = specialBalls.sort(() => Math.random() - 0.5);
    const selectedSpecial = shuffled.slice(0, 2);

    const hasMasterBall = Math.random() < 0.05;
    const masterBall = POKEBALLS.find(b => b.id === 'master_ball');

    const selectedBalls = [...basicBalls, ...selectedSpecial];
    if (hasMasterBall && masterBall) {
      selectedBalls.push(masterBall);
    }

    selectedBalls.forEach(ball => {
      const stock = getRandomStock(ball);
      const price = getPriceWithStock(ball.basePrice, stock, ball.maxStock);

      stocks[ball.id] = {
        ballId: ball.id,
        stock,
        price,
        maxStock: ball.maxStock,
        lastRefresh: now,
      };
    });

    return stocks;
  }

  async getBalance(uuid: string): Promise<{ uuid: string; balance: number; username: string }> {
    try {
      const user = await this.usersCollection.findOne({ minecraftUuid: uuid });

      if (!user) {
        throw Errors.playerNotFound();
      }

      return {
        uuid,
        balance: user.cobbleDollarsBalance || 0,
        username: user.minecraftUsername || 'Unknown',
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[SHOP SERVICE] Error obteniendo balance:', error);
      throw Errors.databaseError();
    }
  }

  async purchase(uuid: string, ballId: string, quantity: number): Promise<any> {
    try {
      if (quantity < 1) {
        throw Errors.validationError('La cantidad debe ser mayor a 0');
      }

      // Execute purchase within atomic transaction
      return await this.transactionManager.executeTransaction(async (session: ClientSession) => {
        // 1. Check stock availability (with session for transaction)
        const stockData = await this.shopStockCollection.findOne({ id: 'current' }, { session });
        if (!stockData || !stockData.stocks[ballId]) {
          throw Errors.notFound('Pokéball');
        }

        const ballStock = stockData.stocks[ballId];

        if (ballStock.stock < quantity) {
          throw Errors.insufficientStock();
        }

        // 2. Check user balance (with session for transaction)
        const user = await this.usersCollection.findOne({ minecraftUuid: uuid }, { session });
        if (!user) {
          throw Errors.playerNotFound();
        }

        const totalCost = ballStock.price * quantity;
        const currentBalance = user.cobbleDollarsBalance || 0;

        if (currentBalance < totalCost) {
          throw Errors.insufficientBalance();
        }

        // 3. Atomically update stock (prevents race condition)
        const newStock = ballStock.stock - quantity;
        const stockUpdateResult = await this.shopStockCollection.updateOne(
          { 
            id: 'current',
            [`stocks.${ballId}.stock`]: { $gte: quantity } // Ensure stock hasn't changed
          },
          { 
            $set: { [`stocks.${ballId}.stock`]: newStock },
            $inc: { [`stocks.${ballId}.totalSold`]: quantity }
          },
          { session }
        );

        // If stock update failed, someone else bought it first
        if (stockUpdateResult.matchedCount === 0) {
          throw Errors.insufficientStock();
        }

        // 4. Atomically deduct balance
        const newBalance = currentBalance - totalCost;
        await this.usersCollection.updateOne(
          { minecraftUuid: uuid },
          { 
            $set: { 
              cobbleDollarsBalance: newBalance, 
              updatedAt: new Date() 
            } 
          },
          { session }
        );

        // 5. Create purchase record
        const purchases = await this.shopPurchasesCollection.findOne({ uuid }, { session });
        const pending = purchases?.pending || [];

        const ball = POKEBALLS.find(b => b.id === ballId);
        const ballName = ball?.name || ballId;

        const purchaseItem: PurchaseItem = {
          ballId,
          ballName,
          quantity,
          pricePerUnit: ballStock.price,
          totalPrice: totalCost,
          purchasedAt: new Date().toISOString(),
          claimed: false,
          status: 'pending',
          deliveryAttempts: 0,
        };

        pending.push(purchaseItem);

        await this.shopPurchasesCollection.updateOne(
          { uuid },
          {
            $set: {
              uuid,
              username: user.minecraftUsername || 'Unknown',
              pending,
            },
          },
          { upsert: true, session }
        );

        // Transaction will auto-commit if we reach here
        return {
          success: true,
          newBalance,
          totalCost,
          quantity,
          ballId,
          message: `Compra exitosa: ${quantity}x ${ballId}. Reclama en el juego con /claimshop`,
        };
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[SHOP SERVICE] Error en compra:', error);
      throw Errors.databaseError();
    }
  }

  async getPurchases(uuid: string): Promise<{ uuid: string; purchases: PurchaseItem[] }> {
    try {
      const purchaseData = await this.shopPurchasesCollection.findOne({ uuid });

      if (!purchaseData || !purchaseData.pending || purchaseData.pending.length === 0) {
        return { uuid, purchases: [] };
      }

      const unclaimedPurchases = purchaseData.pending.filter(p => !p.claimed);

      return {
        uuid,
        purchases: unclaimedPurchases,
      };
    } catch (error) {
      console.error('[SHOP SERVICE] Error obteniendo compras:', error);
      throw Errors.databaseError();
    }
  }

  async claimPurchase(uuid: string, purchaseId: string): Promise<{ success: boolean; message: string }> {
    try {
      const purchaseData = await this.shopPurchasesCollection.findOne({ uuid });

      if (!purchaseData) {
        throw Errors.purchaseNotFound();
      }

      const updatedPending = purchaseData.pending.map(p => {
        if (p.purchasedAt === purchaseId) {
          return { ...p, claimed: true, claimedAt: new Date().toISOString(), status: 'completed' as const };
        }
        return p;
      });

      await this.shopPurchasesCollection.updateOne({ uuid }, { $set: { pending: updatedPending } });

      return {
        success: true,
        message: 'Compra reclamada exitosamente',
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[SHOP SERVICE] Error reclamando compra:', error);
      throw Errors.databaseError();
    }
  }

  async refundPurchase(uuid: string, purchaseId: string, reason: string): Promise<{ success: boolean; refundAmount: number; message: string }> {
    try {
      // Execute refund within atomic transaction
      return await this.transactionManager.executeTransaction(async (session) => {
        // 1. Find the purchase
        const purchaseData = await this.shopPurchasesCollection.findOne({ uuid }, { session });

        if (!purchaseData) {
          throw Errors.purchaseNotFound();
        }

        const purchase = purchaseData.pending.find(p => p.purchasedAt === purchaseId);

        if (!purchase) {
          throw Errors.purchaseNotFound();
        }

        // Check if already refunded
        if (purchase.status === 'refunded') {
          throw Errors.validationError('Esta compra ya fue reembolsada');
        }

        // 2. Refund the balance
        const user = await this.usersCollection.findOne({ minecraftUuid: uuid }, { session });
        if (!user) {
          throw Errors.playerNotFound();
        }

        const refundAmount = purchase.totalPrice;
        const newBalance = (user.cobbleDollarsBalance || 0) + refundAmount;

        await this.usersCollection.updateOne(
          { minecraftUuid: uuid },
          { 
            $set: { 
              cobbleDollarsBalance: newBalance, 
              updatedAt: new Date() 
            } 
          },
          { session }
        );

        // 3. Restore stock
        const stockData = await this.shopStockCollection.findOne({ id: 'current' }, { session });
        if (stockData && stockData.stocks[purchase.ballId]) {
          const ballStock = stockData.stocks[purchase.ballId];
          if (ballStock) {
            const currentStock = ballStock.stock;
            const newStock = currentStock + purchase.quantity;

            await this.shopStockCollection.updateOne(
              { id: 'current' },
              { 
                $set: { [`stocks.${purchase.ballId}.stock`]: newStock } 
              },
              { session }
            );
          }
        }

        // 4. Mark purchase as refunded
        const updatedPending = purchaseData.pending.map(p => {
          if (p.purchasedAt === purchaseId) {
            return { 
              ...p, 
              status: 'refunded' as const, 
              refundReason: reason,
              claimed: false 
            };
          }
          return p;
        });

        await this.shopPurchasesCollection.updateOne(
          { uuid },
          { $set: { pending: updatedPending } },
          { session }
        );

        console.log(`[SHOP SERVICE] Refund successful: ${uuid} - ${refundAmount} CobbleDollars - Reason: ${reason}`);

        return {
          success: true,
          refundAmount,
          message: `Reembolso exitoso: ${refundAmount} CobbleDollars devueltos`,
        };
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[SHOP SERVICE] Error en reembolso:', error);
      throw Errors.databaseError();
    }
  }
}
