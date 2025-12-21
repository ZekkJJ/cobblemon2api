/**
 * Servicio de Tienda
 * Cobblemon Los Pitufos - Backend API
 */

import { Collection } from 'mongodb';
import { User } from '../../shared/types/user.types.js';
import { ShopStock, ShopPurchase, BallStock, PurchaseItem } from '../../shared/types/shop.types.js';
import { POKEBALLS, getRandomStock, getPriceWithStock } from '../../shared/data/pokeballs.data.js';
import { AppError, Errors } from '../../shared/middleware/error-handler.js';

const STOCK_REFRESH_INTERVAL = 3600000; // 1 hora

export class ShopService {
  constructor(
    private usersCollection: Collection<User>,
    private shopStockCollection: Collection<ShopStock>,
    private shopPurchasesCollection: Collection<ShopPurchase>
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

      const stockData = await this.shopStockCollection.findOne({ id: 'current' });
      if (!stockData || !stockData.stocks[ballId]) {
        throw Errors.notFound('Pokéball');
      }

      const ballStock = stockData.stocks[ballId];

      if (ballStock.stock < quantity) {
        throw Errors.insufficientStock();
      }

      const user = await this.usersCollection.findOne({ minecraftUuid: uuid });
      if (!user) {
        throw Errors.playerNotFound();
      }

      const totalCost = ballStock.price * quantity;
      const currentBalance = user.cobbleDollarsBalance || 0;

      if (currentBalance < totalCost) {
        throw Errors.insufficientBalance();
      }

      ballStock.stock -= quantity;
      await this.shopStockCollection.updateOne(
        { id: 'current' },
        { $set: { [`stocks.${ballId}.stock`]: ballStock.stock } }
      );

      const newBalance = currentBalance - totalCost;
      await this.usersCollection.updateOne(
        { minecraftUuid: uuid },
        { $set: { cobbleDollarsBalance: newBalance, updatedAt: new Date() } }
      );

      const purchases = await this.shopPurchasesCollection.findOne({ uuid });
      const pending = purchases?.pending || [];

      // Obtener información de la ball
      const ball = POKEBALLS.find(b => b.id === ballId);
      const ballName = ball?.name || ballId;

      pending.push({
        ballId,
        ballName,
        quantity,
        pricePerUnit: ballStock.price,
        totalPrice: totalCost,
        purchasedAt: new Date().toISOString(),
        claimed: false,
      });

      await this.shopPurchasesCollection.updateOne(
        { uuid },
        {
          $set: {
            uuid,
            username: user.minecraftUsername || 'Unknown',
            pending,
          },
        },
        { upsert: true }
      );

      return {
        success: true,
        newBalance,
        totalCost,
        quantity,
        ballId,
        message: `Compra exitosa: ${quantity}x ${ballId}. Reclama en el juego con /claimshop`,
      };
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
          return { ...p, claimed: true, claimedAt: new Date().toISOString() };
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
}
