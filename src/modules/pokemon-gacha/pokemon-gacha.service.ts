/**
 * Pokemon Gacha Service
 * Cobblemon Los Pitufos - Backend API
 * 
 * Servicio principal del sistema gacha tipo Genshin Impact
 */

import { Collection, ClientSession } from 'mongodb';
import { User } from '../../shared/types/user.types.js';
import {
  GachaBanner,
  GachaReward,
  GachaHistoryEntry,
  PendingGachaReward,
  GachaPullResult,
  GachaMultiPullResult,
  GachaStats,
  PityStatus,
  HistoryFilters,
  RarityDistribution,
  Rarity,
  GachaErrorCode,
  PULL_COSTS,
  SHINY_RATE,
  PokemonPoolEntry,
  ItemPoolEntry,
  GachaPokemonData,
  GachaItemData,
} from '../../shared/types/pokemon-gacha.types.js';
import { AppError } from '../../shared/middleware/error-handler.js';
import { TransactionManager } from '../../shared/utils/transaction-manager.js';
import { CryptoRngService, cryptoRng } from './crypto-rng.service.js';
import { PityManagerService } from './pity-manager.service.js';
import { PoolBuilderService, SelectedReward } from './pool-builder.service.js';
import { BannerService } from './banner.service.js';
import { IVGeneratorService, ivGenerator } from './iv-generator.service.js';
import { getPokemonSprite, getPokemonArtwork } from '../../shared/data/gacha-pokemon-helpers.js';
import { getItemSprite } from '../../shared/data/gacha-items-pool.data.js';
import { POKEMON_NATURES } from '../../shared/types/pokemon.types.js';

export class PokemonGachaService {
  private rng: CryptoRngService;
  private ivGen: IVGeneratorService;

  constructor(
    private usersCollection: Collection<User>,
    private historyCollection: Collection<GachaHistoryEntry>,
    private pendingCollection: Collection<PendingGachaReward>,
    private idempotencyCollection: Collection<{ key: string; result: any; createdAt: Date }>,
    private transactionManager: TransactionManager,
    private pityManager: PityManagerService,
    private poolBuilder: PoolBuilderService,
    private bannerService: BannerService
  ) {
    this.rng = cryptoRng;
    this.ivGen = ivGenerator;
  }

  /**
   * Ejecuta una tirada simple
   */
  async pull(
    playerId: string,
    bannerId: string,
    idempotencyKey: string
  ): Promise<GachaPullResult> {
    // Verificar idempotencia
    const cached = await this.checkIdempotency(idempotencyKey);
    if (cached) {
      return cached as GachaPullResult;
    }

    return await this.transactionManager.executeTransaction(async (session) => {
      // Obtener banner activo
      const banner = await this.bannerService.getActiveBanner(bannerId, session);
      const cost = banner.singlePullCost || PULL_COSTS.single;

      // Verificar y deducir balance
      const user = await this.deductBalance(playerId, cost, session);

      // Obtener estado de pity
      const pityCount = await this.pityManager.getPityCount(playerId, bannerId, session);
      const lost5050 = await this.pityManager.getLost5050Status(playerId, bannerId, session);

      // Ejecutar tirada
      const reward = await this.executeRoll(banner, pityCount, lost5050, playerId, idempotencyKey, session);

      // Actualizar pity
      await this.updatePityAfterRoll(playerId, bannerId, banner.type, reward.rarity, cost, session);

      // Actualizar 50/50 si aplica
      if (reward.isFeatured) {
        await this.pityManager.setLost5050Status(playerId, bannerId, false, session);
      } else if (['epic', 'legendary', 'mythic'].includes(reward.rarity)) {
        // Perdió el 50/50
        await this.pityManager.setLost5050Status(playerId, bannerId, true, session);
      }

      // Guardar en historial
      await this.saveHistory(playerId, banner, reward, pityCount, cost, session);

      // Crear entrega pendiente
      await this.createPendingDelivery(playerId, user.minecraftUuid, reward, session);

      // Obtener nuevo estado de pity
      const pityStatus = await this.pityManager.getPityStatus(playerId, bannerId, session);

      const result: GachaPullResult = {
        success: true,
        reward,
        newBalance: user.cobbleDollarsBalance - cost,
        pityStatus,
        message: this.generatePullMessage(reward),
      };

      // Guardar resultado para idempotencia
      await this.saveIdempotency(idempotencyKey, result, session);

      return result;
    });
  }

  /**
   * Ejecuta 10 tiradas (multi-pull)
   */
  async multiPull(
    playerId: string,
    bannerId: string,
    idempotencyKey: string
  ): Promise<GachaMultiPullResult> {
    // Verificar idempotencia
    const cached = await this.checkIdempotency(idempotencyKey);
    if (cached) {
      return cached as GachaMultiPullResult;
    }

    return await this.transactionManager.executeTransaction(async (session) => {
      // Obtener banner activo
      const banner = await this.bannerService.getActiveBanner(bannerId, session);
      const cost = banner.multiPullCost || PULL_COSTS.multi;

      // Verificar y deducir balance
      const user = await this.deductBalance(playerId, cost, session);

      const rewards: GachaReward[] = [];
      let currentPity = await this.pityManager.getPityCount(playerId, bannerId, session);
      let lost5050 = await this.pityManager.getLost5050Status(playerId, bannerId, session);

      // Ejecutar 10 tiradas
      for (let i = 0; i < 10; i++) {
        const pullKey = `${idempotencyKey}_${i}`;
        const reward = await this.executeRoll(banner, currentPity, lost5050, playerId, pullKey, session);
        rewards.push(reward);

        // Actualizar pity para siguiente tirada
        if (['epic', 'legendary', 'mythic'].includes(reward.rarity)) {
          currentPity = 0;
          if (reward.isFeatured) {
            lost5050 = false;
          } else {
            lost5050 = true;
          }
        } else {
          currentPity++;
        }

        // Guardar en historial
        await this.saveHistory(playerId, banner, reward, currentPity, cost / 10, session);

        // Crear entrega pendiente
        await this.createPendingDelivery(playerId, user.minecraftUuid, reward, session);
      }

      // Actualizar pity final
      await this.pityManager.setLost5050Status(playerId, bannerId, lost5050, session);

      // Obtener nuevo estado de pity
      const pityStatus = await this.pityManager.getPityStatus(playerId, bannerId, session);

      // Calcular highlights
      const highlights = {
        epicOrBetter: rewards.filter(r => ['epic', 'legendary', 'mythic'].includes(r.rarity)).length,
        shinies: rewards.filter(r => r.isShiny).length,
        featured: rewards.filter(r => r.isFeatured).length,
      };

      const result: GachaMultiPullResult = {
        success: true,
        rewards,
        newBalance: user.cobbleDollarsBalance - cost,
        pityStatus,
        message: this.generateMultiPullMessage(highlights),
        highlights,
      };

      // Guardar resultado para idempotencia
      await this.saveIdempotency(idempotencyKey, result, session);

      return result;
    });
  }


  /**
   * Ejecuta una tirada individual
   */
  private async executeRoll(
    banner: GachaBanner,
    pityCount: number,
    lost5050: boolean,
    playerId: string,
    idempotencyKey: string,
    session: ClientSession
  ): Promise<GachaReward> {
    // Construir pool
    let pool = this.poolBuilder.buildPool(banner);

    // Ajustar por pity
    pool = this.poolBuilder.calculateAdjustedProbabilities(pool, pityCount);

    // Seleccionar recompensa
    let selected = this.poolBuilder.selectReward(pool);

    // Aplicar sistema 50/50 si es Epic+
    if (['epic', 'legendary', 'mythic'].includes(selected.rarity)) {
      const featured5050 = this.poolBuilder.apply5050System(pool, banner, selected.rarity, lost5050);
      if (featured5050) {
        selected = featured5050;
      }
    }

    // Determinar si es shiny
    const isShiny = this.rng.chance(SHINY_RATE);

    // Crear recompensa
    const reward = this.createReward(selected, banner, playerId, idempotencyKey, isShiny);

    return reward;
  }

  /**
   * Crea el objeto de recompensa
   */
  private createReward(
    selected: SelectedReward,
    banner: GachaBanner,
    playerId: string,
    idempotencyKey: string,
    isShiny: boolean
  ): GachaReward {
    const rewardId = this.rng.generateUUID();

    const baseReward: GachaReward = {
      rewardId,
      playerId,
      bannerId: banner.bannerId,
      bannerName: banner.nameEs || banner.name,
      type: selected.type,
      rarity: selected.rarity,
      isShiny: selected.type === 'pokemon' ? isShiny : false,
      isFeatured: selected.isFeatured,
      status: 'pending',
      pulledAt: new Date(),
      idempotencyKey,
    };

    if (selected.type === 'pokemon') {
      const pokemonData = selected.data as PokemonPoolEntry;
      const ivs = this.ivGen.generateIVs(selected.rarity);
      const nature = this.rng.weightedSelect(
        [...POKEMON_NATURES],
        POKEMON_NATURES.map(() => 1)
      );

      baseReward.pokemon = {
        pokemonId: pokemonData.pokemonId,
        name: pokemonData.name,
        nameEs: pokemonData.nameEs || pokemonData.name,
        level: 1,
        isShiny,
        ivs,
        nature,
        ability: 'default', // Se asignará en el plugin
        types: pokemonData.types,
        sprite: getPokemonSprite(pokemonData.pokemonId, isShiny),
        spriteShiny: getPokemonSprite(pokemonData.pokemonId, true),
      };
    } else {
      const itemData = selected.data as ItemPoolEntry;
      baseReward.item = {
        itemId: itemData.itemId,
        name: itemData.name,
        nameEs: itemData.nameEs || itemData.name,
        quantity: itemData.quantity,
        sprite: getItemSprite(itemData.itemId),
      };
    }

    return baseReward;
  }

  /**
   * Verifica y deduce el balance del jugador
   */
  private async deductBalance(
    playerId: string,
    cost: number,
    session: ClientSession
  ): Promise<User> {
    const user = await this.usersCollection.findOne(
      { discordId: playerId },
      { session }
    );

    if (!user) {
      throw new AppError('Jugador no encontrado', 404, GachaErrorCode.PLAYER_NOT_FOUND);
    }

    if (user.cobbleDollarsBalance < cost) {
      throw new AppError(
        `Balance insuficiente. Necesitas ${cost} CD, tienes ${user.cobbleDollarsBalance} CD`,
        400,
        GachaErrorCode.INSUFFICIENT_BALANCE
      );
    }

    await this.usersCollection.updateOne(
      { discordId: playerId },
      { 
        $inc: { cobbleDollarsBalance: -cost },
        $set: { updatedAt: new Date() },
      },
      { session }
    );

    return user;
  }

  /**
   * Actualiza el pity después de una tirada
   */
  private async updatePityAfterRoll(
    playerId: string,
    bannerId: string,
    bannerType: 'standard' | 'limited' | 'event',
    rarity: Rarity,
    cost: number,
    session: ClientSession
  ): Promise<void> {
    if (['epic', 'legendary', 'mythic'].includes(rarity)) {
      await this.pityManager.resetPity(playerId, bannerId, rarity, session);
    } else {
      await this.pityManager.incrementPity(playerId, bannerId, bannerType, cost, session);
    }
  }

  /**
   * Guarda la tirada en el historial
   */
  private async saveHistory(
    playerId: string,
    banner: GachaBanner,
    reward: GachaReward,
    pityAtPull: number,
    cost: number,
    session: ClientSession
  ): Promise<void> {
    const entry: GachaHistoryEntry = {
      playerId,
      bannerId: banner.bannerId,
      bannerName: banner.nameEs || banner.name,
      reward,
      rarity: reward.rarity,
      isShiny: reward.isShiny,
      isFeatured: reward.isFeatured,
      pityAtPull,
      cost,
      pulledAt: new Date(),
    };

    await this.historyCollection.insertOne(entry, { session });
  }

  /**
   * Crea una entrega pendiente
   */
  private async createPendingDelivery(
    playerId: string,
    playerUuid: string | undefined,
    reward: GachaReward,
    session: ClientSession
  ): Promise<void> {
    const pending: PendingGachaReward = {
      rewardId: reward.rewardId,
      playerId,
      playerUuid,
      type: reward.type,
      pokemon: reward.pokemon,
      item: reward.item,
      rarity: reward.rarity,
      isShiny: reward.isShiny,
      status: 'pending',
      deliveryAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.pendingCollection.insertOne(pending, { session });
  }

  /**
   * Verifica idempotencia
   */
  private async checkIdempotency(key: string): Promise<any | null> {
    const cached = await this.idempotencyCollection.findOne({ key });
    return cached?.result || null;
  }

  /**
   * Guarda resultado para idempotencia
   */
  private async saveIdempotency(
    key: string,
    result: any,
    session: ClientSession
  ): Promise<void> {
    await this.idempotencyCollection.updateOne(
      { key },
      { 
        $set: { 
          key, 
          result, 
          createdAt: new Date() 
        } 
      },
      { upsert: true, session }
    );
  }

  /**
   * Genera mensaje de tirada
   */
  private generatePullMessage(reward: GachaReward): string {
    const name = reward.type === 'pokemon' 
      ? reward.pokemon?.nameEs || reward.pokemon?.name
      : reward.item?.nameEs || reward.item?.name;

    if (reward.isShiny) {
      return `🌟 ¡INCREÍBLE! ¡Has obtenido un ${name} SHINY!`;
    }

    if (reward.rarity === 'mythic') {
      return `✨ ¡MÍTICO! ¡Has obtenido ${name}!`;
    }

    if (reward.rarity === 'legendary') {
      return `⭐ ¡LEGENDARIO! ¡Has obtenido ${name}!`;
    }

    if (reward.rarity === 'epic') {
      return `💜 ¡ÉPICO! ¡Has obtenido ${name}!`;
    }

    return `¡Has obtenido ${name}!`;
  }

  /**
   * Genera mensaje de multi-pull
   */
  private generateMultiPullMessage(highlights: { epicOrBetter: number; shinies: number; featured: number }): string {
    const parts: string[] = [];

    if (highlights.shinies > 0) {
      parts.push(`🌟 ${highlights.shinies} SHINY${highlights.shinies > 1 ? 'S' : ''}`);
    }

    if (highlights.epicOrBetter > 0) {
      parts.push(`⭐ ${highlights.epicOrBetter} Épico+`);
    }

    if (highlights.featured > 0) {
      parts.push(`✨ ${highlights.featured} Destacado${highlights.featured > 1 ? 's' : ''}`);
    }

    if (parts.length === 0) {
      return '¡10 tiradas completadas!';
    }

    return `¡10 tiradas completadas! ${parts.join(' | ')}`;
  }


  /**
   * Obtiene el estado de pity de un jugador
   */
  async getPityStatus(playerId: string, bannerId: string): Promise<PityStatus> {
    return await this.pityManager.getPityStatus(playerId, bannerId);
  }

  /**
   * Obtiene el historial de tiradas de un jugador
   */
  async getHistory(playerId: string, filters: HistoryFilters): Promise<GachaHistoryEntry[]> {
    const query: any = { playerId };

    if (filters.bannerId) {
      query.bannerId = filters.bannerId;
    }

    if (filters.rarity) {
      query.rarity = filters.rarity;
    }

    if (filters.startDate || filters.endDate) {
      query.pulledAt = {};
      if (filters.startDate) {
        query.pulledAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.pulledAt.$lte = new Date(filters.endDate);
      }
    }

    const limit = Math.min(filters.limit || 100, 100);
    const offset = filters.offset || 0;

    return await this.historyCollection
      .find(query)
      .sort({ pulledAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
  }

  /**
   * Obtiene estadísticas del jugador
   */
  async getStats(playerId: string): Promise<GachaStats> {
    const history = await this.historyCollection.find({ playerId }).toArray();

    const rarityDistribution: RarityDistribution = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
      mythic: 0,
    };

    let totalSpent = 0;
    let shinyCount = 0;
    let featuredCount = 0;
    let pokemonCount = 0;
    let itemCount = 0;
    let totalPityToEpic = 0;
    let epicCount = 0;

    for (const entry of history) {
      rarityDistribution[entry.rarity]++;
      totalSpent += entry.cost;

      if (entry.isShiny) shinyCount++;
      if (entry.isFeatured) featuredCount++;
      if (entry.reward.type === 'pokemon') pokemonCount++;
      if (entry.reward.type === 'item') itemCount++;

      if (['epic', 'legendary', 'mythic'].includes(entry.rarity)) {
        totalPityToEpic += entry.pityAtPull;
        epicCount++;
      }
    }

    const totalPulls = history.length;
    const averagePityToEpic = epicCount > 0 ? totalPityToEpic / epicCount : 0;

    // Calcular luck rating (comparado con probabilidades base)
    const expectedEpicPlus = totalPulls * 0.046; // 4% + 0.6% + 0.0001%
    const actualEpicPlus = rarityDistribution.epic + rarityDistribution.legendary + rarityDistribution.mythic;
    const luckRating = expectedEpicPlus > 0 ? (actualEpicPlus / expectedEpicPlus) * 100 : 100;

    return {
      totalPulls,
      totalSpent,
      rarityDistribution,
      shinyCount,
      featuredCount,
      pokemonCount,
      itemCount,
      averagePityToEpic: Math.round(averagePityToEpic * 10) / 10,
      luckRating: Math.round(luckRating),
    };
  }

  /**
   * Obtiene recompensas pendientes de un jugador
   */
  async getPendingRewards(playerUuid: string): Promise<PendingGachaReward[]> {
    return await this.pendingCollection
      .find({ 
        playerUuid, 
        status: 'pending' 
      })
      .sort({ createdAt: 1 })
      .toArray();
  }

  /**
   * Marca una recompensa como reclamada
   */
  async markRewardAsClaimed(rewardId: string): Promise<boolean> {
    const result = await this.pendingCollection.updateOne(
      { rewardId, status: 'pending' },
      {
        $set: {
          status: 'claimed',
          claimedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Marca una recompensa como fallida
   */
  async markRewardAsFailed(rewardId: string, reason: string): Promise<boolean> {
    const result = await this.pendingCollection.updateOne(
      { rewardId },
      {
        $set: {
          status: 'failed',
          failureReason: reason,
          updatedAt: new Date(),
        },
        $inc: {
          deliveryAttempts: 1,
        },
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Marca inicio de entrega
   */
  async markDeliveryStart(rewardId: string): Promise<boolean> {
    const result = await this.pendingCollection.updateOne(
      { rewardId, status: 'pending' },
      {
        $set: {
          status: 'delivering',
          lastDeliveryAttempt: new Date(),
          updatedAt: new Date(),
        },
        $inc: {
          deliveryAttempts: 1,
        },
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Obtiene banners activos
   */
  async getActiveBanners(): Promise<GachaBanner[]> {
    return await this.bannerService.getActiveBanners();
  }

  /**
   * Obtiene un banner por ID
   */
  async getBanner(bannerId: string): Promise<GachaBanner | null> {
    return await this.bannerService.getBanner(bannerId);
  }
}
