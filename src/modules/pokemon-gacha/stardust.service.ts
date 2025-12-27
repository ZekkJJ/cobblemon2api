/**
 * Stardust Service
 * Cobblemon Los Pitufos - Backend API
 * 
 * Sistema de Stardust para duplicados del gacha
 */

import { Collection, ClientSession } from 'mongodb';
import { ObjectId } from 'mongodb';
import { Rarity } from '../../shared/types/pokemon-gacha.types.js';

// Stardust otorgado por duplicado según rareza
export const STARDUST_BY_RARITY: Record<Rarity, number> = {
  common: 5,
  uncommon: 15,
  rare: 40,
  epic: 100,
  legendary: 300,
  mythic: 500,
};

// Bonus por shiny duplicado
export const SHINY_STARDUST_MULTIPLIER = 5;

export interface StardustRecord {
  _id?: ObjectId;
  playerId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StardustTransaction {
  _id?: ObjectId;
  playerId: string;
  amount: number;
  type: 'earn' | 'spend';
  reason: string;
  details?: Record<string, any>;
  createdAt: Date;
}

export interface StardustShopItem {
  itemId: string;
  name: string;
  nameEs: string;
  description: string;
  cost: number;
  type: 'pokemon' | 'item' | 'currency' | 'cosmetic';
  data: Record<string, any>;
  stock?: number; // null = unlimited
  purchaseLimit?: number; // per player
}

// Items disponibles en la tienda de Stardust
export const STARDUST_SHOP_ITEMS: StardustShopItem[] = [
  {
    itemId: 'rare_candy_x5',
    name: 'Rare Candy x5',
    nameEs: 'Caramelo Raro x5',
    description: '5 Rare Candies to level up your Pokémon',
    cost: 50,
    type: 'item',
    data: { itemId: 'rare_candy', quantity: 5 },
  },
  {
    itemId: 'master_ball',
    name: 'Master Ball',
    nameEs: 'Master Ball',
    description: 'The ultimate Poké Ball',
    cost: 500,
    type: 'item',
    data: { itemId: 'master_ball', quantity: 1 },
    purchaseLimit: 1,
  },
  {
    itemId: 'cobble_dollars_1000',
    name: '1000 CobbleDollars',
    nameEs: '1000 CobbleDollars',
    description: 'Convert Stardust to CobbleDollars',
    cost: 200,
    type: 'currency',
    data: { currency: 'cobbleDollars', amount: 1000 },
  },
  {
    itemId: 'guaranteed_epic',
    name: 'Epic Ticket',
    nameEs: 'Ticket Épico',
    description: 'Guaranteed Epic or better pull',
    cost: 1000,
    type: 'item',
    data: { itemId: 'epic_ticket', quantity: 1 },
    purchaseLimit: 3,
  },
  {
    itemId: 'shiny_charm',
    name: 'Shiny Charm (1 day)',
    nameEs: 'Amuleto Shiny (1 día)',
    description: 'Double shiny rate for 24 hours',
    cost: 300,
    type: 'cosmetic',
    data: { effect: 'shiny_boost', duration: 86400000 },
  },
];

export class StardustService {
  constructor(
    private stardustCollection: Collection<StardustRecord>,
    private transactionsCollection: Collection<StardustTransaction>
  ) {}

  /**
   * Obtiene el balance de Stardust de un jugador
   */
  async getBalance(playerId: string, session?: ClientSession): Promise<number> {
    const record = await this.stardustCollection.findOne(
      { playerId },
      { session }
    );
    return record?.balance || 0;
  }

  /**
   * Obtiene el registro completo de Stardust
   */
  async getStardustRecord(playerId: string, session?: ClientSession): Promise<StardustRecord | null> {
    return await this.stardustCollection.findOne({ playerId }, { session });
  }

  /**
   * Añade Stardust por duplicado
   */
  async addStardustForDuplicate(
    playerId: string,
    rarity: Rarity,
    isShiny: boolean,
    pokemonName: string,
    session?: ClientSession
  ): Promise<{ amount: number; newBalance: number }> {
    let amount = STARDUST_BY_RARITY[rarity];
    
    if (isShiny) {
      amount *= SHINY_STARDUST_MULTIPLIER;
    }

    const now = new Date();

    // Actualizar balance
    const result = await this.stardustCollection.findOneAndUpdate(
      { playerId },
      {
        $inc: {
          balance: amount,
          totalEarned: amount,
        },
        $set: { updatedAt: now },
        $setOnInsert: {
          playerId,
          totalSpent: 0,
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: 'after', session }
    );

    // Registrar transacción
    await this.transactionsCollection.insertOne({
      playerId,
      amount,
      type: 'earn',
      reason: 'duplicate',
      details: {
        pokemonName,
        rarity,
        isShiny,
      },
      createdAt: now,
    }, { session });

    return {
      amount,
      newBalance: result?.balance || amount,
    };
  }

  /**
   * Gasta Stardust
   */
  async spendStardust(
    playerId: string,
    amount: number,
    reason: string,
    details?: Record<string, any>,
    session?: ClientSession
  ): Promise<{ success: boolean; newBalance: number; message: string }> {
    const currentBalance = await this.getBalance(playerId, session);

    if (currentBalance < amount) {
      return {
        success: false,
        newBalance: currentBalance,
        message: `Stardust insuficiente. Tienes ${currentBalance}, necesitas ${amount}.`,
      };
    }

    const now = new Date();

    // Actualizar balance
    const result = await this.stardustCollection.findOneAndUpdate(
      { playerId },
      {
        $inc: {
          balance: -amount,
          totalSpent: amount,
        },
        $set: { updatedAt: now },
      },
      { returnDocument: 'after', session }
    );

    // Registrar transacción
    await this.transactionsCollection.insertOne({
      playerId,
      amount: -amount,
      type: 'spend',
      reason,
      details,
      createdAt: now,
    }, { session });

    return {
      success: true,
      newBalance: result?.balance || 0,
      message: `Gastaste ${amount} Stardust.`,
    };
  }

  /**
   * Compra un item de la tienda de Stardust
   */
  async purchaseShopItem(
    playerId: string,
    itemId: string,
    session?: ClientSession
  ): Promise<{
    success: boolean;
    item?: StardustShopItem;
    newBalance: number;
    message: string;
  }> {
    const item = STARDUST_SHOP_ITEMS.find(i => i.itemId === itemId);

    if (!item) {
      return {
        success: false,
        newBalance: await this.getBalance(playerId, session),
        message: 'Item no encontrado.',
      };
    }

    // Verificar límite de compra si existe
    if (item.purchaseLimit) {
      const purchases = await this.transactionsCollection.countDocuments({
        playerId,
        reason: 'shop_purchase',
        'details.itemId': itemId,
      }, { session });

      if (purchases >= item.purchaseLimit) {
        return {
          success: false,
          newBalance: await this.getBalance(playerId, session),
          message: `Has alcanzado el límite de compra para ${item.nameEs}.`,
        };
      }
    }

    // Intentar gastar Stardust
    const spendResult = await this.spendStardust(
      playerId,
      item.cost,
      'shop_purchase',
      { itemId, itemName: item.nameEs },
      session
    );

    if (!spendResult.success) {
      return {
        success: false,
        newBalance: spendResult.newBalance,
        message: spendResult.message,
      };
    }

    return {
      success: true,
      item,
      newBalance: spendResult.newBalance,
      message: `¡Compraste ${item.nameEs}!`,
    };
  }

  /**
   * Obtiene el historial de transacciones
   */
  async getTransactionHistory(
    playerId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<StardustTransaction[]> {
    return await this.transactionsCollection
      .find({ playerId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
  }

  /**
   * Obtiene los items de la tienda con disponibilidad para el jugador
   */
  async getShopItemsForPlayer(playerId: string): Promise<Array<StardustShopItem & {
    canPurchase: boolean;
    purchasesRemaining?: number;
  }>> {
    const balance = await this.getBalance(playerId);
    
    const itemsWithAvailability = await Promise.all(
      STARDUST_SHOP_ITEMS.map(async (item) => {
        let purchasesRemaining: number | undefined;
        
        if (item.purchaseLimit) {
          const purchases = await this.transactionsCollection.countDocuments({
            playerId,
            reason: 'shop_purchase',
            'details.itemId': item.itemId,
          });
          purchasesRemaining = Math.max(0, item.purchaseLimit - purchases);
        }

        const canPurchase = balance >= item.cost && 
          (purchasesRemaining === undefined || purchasesRemaining > 0);

        return {
          ...item,
          canPurchase,
          purchasesRemaining,
        };
      })
    );

    return itemsWithAvailability;
  }

  /**
   * Calcula el Stardust que se obtendría por un duplicado
   */
  calculateStardustForDuplicate(rarity: Rarity, isShiny: boolean): number {
    let amount = STARDUST_BY_RARITY[rarity];
    if (isShiny) {
      amount *= SHINY_STARDUST_MULTIPLIER;
    }
    return amount;
  }
}