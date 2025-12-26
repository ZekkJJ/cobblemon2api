/**
 * Banner Service
 * Cobblemon Los Pitufos - Backend API
 * 
 * Gestiona los banners del sistema gacha
 */

import { Collection, ClientSession, ObjectId } from 'mongodb';
import {
  GachaBanner,
  CreateBannerData,
  UpdateBannerData,
  GachaErrorCode,
} from '../../shared/types/pokemon-gacha.types.js';
import { AppError } from '../../shared/middleware/error-handler.js';
import { cryptoRng } from './crypto-rng.service.js';

export class BannerService {
  constructor(private bannersCollection: Collection<GachaBanner>) {}

  /**
   * Obtiene todos los banners activos
   */
  async getActiveBanners(): Promise<GachaBanner[]> {
    const now = new Date();
    
    // Primero, desactivar banners expirados
    await this.deactivateExpiredBanners();

    return await this.bannersCollection.find({
      isActive: true,
      startDate: { $lte: now },
      $or: [
        { endDate: null },
        { endDate: { $gt: now } },
      ],
    }).toArray();
  }

  /**
   * Obtiene un banner por ID
   */
  async getBanner(bannerId: string, session?: ClientSession): Promise<GachaBanner | null> {
    return await this.bannersCollection.findOne(
      { bannerId },
      { session }
    );
  }

  /**
   * Obtiene un banner por ID y valida que esté activo
   */
  async getActiveBanner(bannerId: string, session?: ClientSession): Promise<GachaBanner> {
    const banner = await this.getBanner(bannerId, session);

    if (!banner) {
      throw new AppError('Banner no encontrado', 404, GachaErrorCode.BANNER_NOT_FOUND);
    }

    const now = new Date();

    if (!banner.isActive) {
      throw new AppError('Banner no está activo', 400, GachaErrorCode.BANNER_EXPIRED);
    }

    if (banner.startDate > now) {
      throw new AppError('Banner aún no ha comenzado', 400, GachaErrorCode.BANNER_NOT_STARTED);
    }

    if (banner.endDate && banner.endDate < now) {
      // Auto-desactivar banner expirado
      await this.deactivateBanner(bannerId);
      throw new AppError('Banner ha expirado', 400, GachaErrorCode.BANNER_EXPIRED);
    }

    return banner;
  }

  /**
   * Crea un nuevo banner
   */
  async createBanner(data: CreateBannerData, createdBy: string): Promise<GachaBanner> {
    const bannerId = `banner_${Date.now()}_${cryptoRng.generateUUID().slice(0, 8)}`;

    const banner: GachaBanner = {
      bannerId,
      name: data.name,
      nameEs: data.nameEs,
      description: data.description,
      descriptionEs: data.descriptionEs,
      artwork: data.artwork,
      type: data.type,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      isActive: true,
      featuredPokemon: data.featuredPokemon || [],
      featuredItems: data.featuredItems || [],
      rateUpMultiplier: data.rateUpMultiplier || 5,
      pokemonPool: data.pokemonPool || [],
      itemPool: data.itemPool || [],
      singlePullCost: data.singlePullCost || 500,
      multiPullCost: data.multiPullCost || 4500,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
    };

    await this.bannersCollection.insertOne(banner);

    return banner;
  }

  /**
   * Actualiza un banner existente
   */
  async updateBanner(bannerId: string, data: UpdateBannerData): Promise<GachaBanner> {
    const updateData: Partial<GachaBanner> = {
      ...data,
      updatedAt: new Date(),
    };

    // Convertir fechas si se proporcionan
    if (data.startDate) {
      updateData.startDate = new Date(data.startDate);
    }
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    }

    const result = await this.bannersCollection.findOneAndUpdate(
      { bannerId },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new AppError('Banner no encontrado', 404, GachaErrorCode.BANNER_NOT_FOUND);
    }

    return result;
  }

  /**
   * Desactiva un banner
   */
  async deactivateBanner(bannerId: string): Promise<void> {
    const result = await this.bannersCollection.updateOne(
      { bannerId },
      { 
        $set: { 
          isActive: false,
          updatedAt: new Date(),
        } 
      }
    );

    if (result.matchedCount === 0) {
      throw new AppError('Banner no encontrado', 404, GachaErrorCode.BANNER_NOT_FOUND);
    }
  }

  /**
   * Elimina un banner (soft delete - solo desactiva)
   */
  async deleteBanner(bannerId: string): Promise<void> {
    await this.deactivateBanner(bannerId);
  }

  /**
   * Desactiva automáticamente banners expirados
   */
  async deactivateExpiredBanners(): Promise<number> {
    const now = new Date();
    
    const result = await this.bannersCollection.updateMany(
      {
        isActive: true,
        endDate: { $ne: null, $lt: now },
      },
      {
        $set: {
          isActive: false,
          updatedAt: now,
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`[BANNER SERVICE] Desactivados ${result.modifiedCount} banners expirados`);
    }

    return result.modifiedCount;
  }

  /**
   * Obtiene el banner estándar (permanente)
   */
  async getStandardBanner(): Promise<GachaBanner | null> {
    return await this.bannersCollection.findOne({
      type: 'standard',
      isActive: true,
    });
  }

  /**
   * Verifica si existe un banner estándar, si no, lo crea
   */
  async ensureStandardBanner(): Promise<GachaBanner> {
    let standardBanner = await this.getStandardBanner();

    if (!standardBanner) {
      standardBanner = await this.createBanner({
        name: 'Standard Banner',
        nameEs: 'Banner Estándar',
        description: 'The permanent banner with all available Pokémon and items',
        descriptionEs: 'El banner permanente con todos los Pokémon e items disponibles',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
        type: 'standard',
        startDate: new Date(),
        endDate: null,
        rateUpMultiplier: 1, // Sin rate-up en banner estándar
        singlePullCost: 500,
        multiPullCost: 4500,
      }, 'system');

      console.log('[BANNER SERVICE] Banner estándar creado');
    }

    return standardBanner;
  }

  /**
   * Obtiene todos los banners (para admin)
   */
  async getAllBanners(): Promise<GachaBanner[]> {
    return await this.bannersCollection.find({}).sort({ createdAt: -1 }).toArray();
  }

  /**
   * Cuenta tiradas totales en un banner
   */
  async getBannerStats(bannerId: string): Promise<{
    totalPulls: number;
    uniquePlayers: number;
  }> {
    // Esto se implementará cuando tengamos la colección de historial
    return {
      totalPulls: 0,
      uniquePlayers: 0,
    };
  }
}
