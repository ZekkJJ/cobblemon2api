/**
 * Servicio de Gacha
 * Cobblemon Los Pitufos - Backend API
 * 
 * Maneja la lógica de negocio del sistema gacha de starters
 */

import { Collection, ClientSession } from 'mongodb';
import { User } from '../../shared/types/user.types.js';
import { Starter, StarterWithSprites } from '../../shared/types/pokemon.types.js';
import { STARTERS_DATA, getStarterSprites } from '../../shared/data/starters.data.js';
import { AppError, Errors } from '../../shared/middleware/error-handler.js';
import { getDb } from '../../config/database.js';
import { sendStarterWebhook } from '../../shared/utils/discord-webhook.js';

/**
 * Resultado de verificación de estado de tirada
 */
export interface RollStatusResult {
  canRoll: boolean;
  reason?: 'already_rolled' | 'no_starters_available';
  nickname?: string;
  starter?: StarterWithSprites;
  totalStarters: number;
  availableCount: number;
}

/**
 * Resultado de tirada exitosa
 */
export interface RollResult {
  success: true;
  starter: StarterWithSprites;
  message: string;
}

export class GachaService {
  constructor(
    private usersCollection: Collection<User>,
    private startersCollection: Collection<Starter>
  ) {}

  /**
   * Verifica el estado de tirada de un usuario
   */
  async checkRollStatus(discordId: string): Promise<RollStatusResult> {
    try {
      // Buscar usuario
      const user = await this.usersCollection.findOne({ discordId });

      // Obtener starters reclamados
      const claimedStarters = await this.startersCollection.find({ isClaimed: true }).toArray();
      const availableCount = STARTERS_DATA.length - claimedStarters.length;

      // Si el usuario ya tiene un starter
      if (user && user.starterId) {
        const starterData = STARTERS_DATA.find(s => s.pokemonId === user.starterId);
        if (starterData) {
          const sprites = getStarterSprites(starterData.pokemonId!, user.starterIsShiny || false);
          
          return {
            canRoll: false,
            reason: 'already_rolled',
            nickname: user.nickname,
            starter: {
              ...starterData,
              pokemonId: starterData.pokemonId!,
              isShiny: user.starterIsShiny || false,
              sprites,
              isClaimed: true,
              claimedBy: user.nickname || user.discordUsername,
              claimedAt: user.rolledAt || new Date().toISOString(),
            },
            totalStarters: STARTERS_DATA.length,
            availableCount,
          };
        }
      }

      // Usuario puede hacer tirada
      return {
        canRoll: true,
        nickname: user?.nickname || '',
        totalStarters: STARTERS_DATA.length,
        availableCount,
      };
    } catch (error) {
      console.error('[GACHA SERVICE] Error verificando estado de tirada:', error);
      throw Errors.databaseError();
    }
  }

  /**
   * Realiza una tirada clásica (aleatoria)
   */
  async performClassicRoll(discordId: string, discordUsername?: string): Promise<RollResult> {
    try {
      // Buscar o crear usuario
      let user = await this.usersCollection.findOne({ discordId });

      if (!user) {
        const newUser: Partial<User> = {
          discordId,
          discordUsername: discordUsername || 'Unknown',
          nickname: discordUsername || '',
          starterId: null,
          starterIsShiny: false,
          starterGiven: false,
          rolledAt: null,
          isAdmin: false,
          banned: false,
          verified: false,
          pokemonParty: [],
          pcStorage: [],
          cobbleDollarsBalance: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const insertResult = await this.usersCollection.insertOne(newUser as User);
        user = { ...newUser, _id: insertResult.insertedId } as any;
      }

      // Verificar si ya hizo tirada
      if (user && user.starterId !== null) {
        throw Errors.alreadyRolled();
      }

      // Obtener starters disponibles
      const claimedStarters = await this.startersCollection.find({ isClaimed: true }).toArray();
      const claimedIds = new Set(claimedStarters.map(s => s.pokemonId));
      const availableStarters = STARTERS_DATA.filter(s => !claimedIds.has(s.pokemonId));

      if (availableStarters.length === 0) {
        throw Errors.noStartersAvailable();
      }

      // Selección aleatoria
      const randomIndex = Math.floor(Math.random() * availableStarters.length);
      const selectedStarter = availableStarters[randomIndex];

      if (!selectedStarter) {
        throw Errors.noStartersAvailable();
      }

      // 1% probabilidad de shiny
      const isShiny = Math.random() < 0.01;

      // Actualizar usuario
      await this.usersCollection.updateOne(
        { discordId },
        {
          $set: {
            starterId: selectedStarter.pokemonId,
            starterIsShiny: isShiny,
            rolledAt: new Date().toISOString(),
            starterDeliveryInProgress: false,
            starterDeliveryAttempts: 0,
            updatedAt: new Date(),
          },
        }
      );

      // Marcar starter como reclamado
      const nickname = discordUsername || user?.nickname || user?.discordUsername || 'Desconocido';
      
      await this.startersCollection.updateOne(
        { pokemonId: selectedStarter.pokemonId },
        {
          $set: {
            pokemonId: selectedStarter.pokemonId,
            name: selectedStarter.name,
            isClaimed: true,
            claimedBy: discordId,
            claimedByNickname: nickname,
            minecraftUsername: user?.minecraftUsername,
            claimedAt: new Date().toISOString(),
            starterIsShiny: isShiny,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );

      // Obtener sprites
      const sprites = getStarterSprites(selectedStarter.pokemonId, isShiny);

      const result: RollResult = {
        success: true,
        starter: {
          ...selectedStarter,
          pokemonId: selectedStarter.pokemonId!,
          isShiny,
          sprites,
          isClaimed: true,
          claimedBy: nickname,
          claimedAt: new Date().toISOString(),
        },
        message: isShiny
          ? '🌟 ¡INCREÍBLE! ¡Has obtenido un SHINY!'
          : `¡Felicidades! Has obtenido a ${selectedStarter.nameEs || selectedStarter.name}!`,
      };

      // Enviar webhook de Discord (no bloqueante)
      setImmediate(async () => {
        try {
          await sendStarterWebhook(discordId, nickname, {
            ...selectedStarter,
            isShiny,
            sprites,
          } as any);
        } catch (webhookError) {
          console.error('Webhook error (non-blocking):', webhookError);
        }
      });

      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('[GACHA SERVICE] Error en tirada clásica:', error);
      throw Errors.internal('Error durante la tirada. Por favor intenta de nuevo.');
    }
  }

  /**
   * Obtiene todos los starters con su estado de reclamo
   */
  async getAllStarters(): Promise<{
    starters: StarterWithSprites[];
    byGeneration: Record<number, StarterWithSprites[]>;
    stats: {
      total: number;
      claimed: number;
      available: number;
    };
  }> {
    try {
      // Obtener starters reclamados
      const claimedStarters = await this.startersCollection.find({ isClaimed: true }).toArray();
      
      // Obtener todos los usuarios para resolver nombres
      const users = await this.usersCollection.find({}).toArray();
      const userMap = new Map(users.map(u => [u.discordId || u.minecraftUuid, u]));

      const claimedMap = new Map(claimedStarters.map(s => [s.pokemonId, s]));

      // Combinar datos estáticos con información de reclamo
      const allStarters: StarterWithSprites[] = STARTERS_DATA.map(starter => {
        const claimed = claimedMap.get(starter.pokemonId);
        const isShiny = claimed?.starterIsShiny || false;
        const sprites = getStarterSprites(starter.pokemonId!, isShiny);
        
        // Resolver nombre real del usuario
        let displayName = 'Desconocido';
        if (claimed) {
          const user = userMap.get(claimed.claimedBy || '');
          if (user) {
            displayName = user.minecraftUsername || user.nickname || user.discordUsername || 'Desconocido';
          } else {
            // Fallback a datos desnormalizados
            displayName = claimed.minecraftUsername || claimed.claimedByNickname || 'Desconocido';
          }
        }

        return {
          ...starter,
          pokemonId: starter.pokemonId!,
          sprites,
          isClaimed: !!claimed,
          claimedBy: displayName,
          claimedAt: claimed?.claimedAt || null,
          isShiny,
        };
      });

      // Agrupar por generación
      const byGeneration = allStarters.reduce((acc, starter) => {
        const gen = starter.generation;
        if (!acc[gen]) acc[gen] = [];
        acc[gen].push(starter);
        return acc;
      }, {} as Record<number, StarterWithSprites[]>);

      return {
        starters: allStarters,
        byGeneration,
        stats: {
          total: STARTERS_DATA.length,
          claimed: claimedStarters.length,
          available: STARTERS_DATA.length - claimedStarters.length,
        },
      };
    } catch (error) {
      console.error('[GACHA SERVICE] Error obteniendo starters:', error);
      throw Errors.databaseError();
    }
  }

  /**
   * Marca el inicio de la entrega del starter (idempotencia)
   */
  async markDeliveryStart(uuid: string): Promise<{ success: boolean; canDeliver: boolean; reason?: string }> {
    try {
      const user = await this.usersCollection.findOne({ minecraftUuid: uuid });

      if (!user) {
        return { success: false, canDeliver: false, reason: 'Usuario no encontrado' };
      }

      if (user.starterGiven) {
        return { success: false, canDeliver: false, reason: 'Starter ya fue entregado' };
      }

      if (!user.starterId) {
        return { success: false, canDeliver: false, reason: 'Usuario no tiene starter asignado' };
      }

      if (user.starterDeliveryInProgress) {
        return { success: false, canDeliver: false, reason: 'Entrega ya en progreso' };
      }

      // Marcar entrega en progreso
      await this.usersCollection.updateOne(
        { minecraftUuid: uuid },
        {
          $set: {
            starterDeliveryInProgress: true,
            lastDeliveryAttempt: new Date().toISOString(),
            updatedAt: new Date(),
          },
          $inc: {
            starterDeliveryAttempts: 1,
          },
        }
      );

      return { success: true, canDeliver: true };
    } catch (error) {
      console.error('[GACHA SERVICE] Error marcando inicio de entrega:', error);
      throw Errors.databaseError();
    }
  }

  /**
   * Marca la entrega del starter como exitosa
   */
  async markDeliverySuccess(uuid: string): Promise<{ success: boolean }> {
    try {
      await this.usersCollection.updateOne(
        { minecraftUuid: uuid },
        {
          $set: {
            starterGiven: true,
            starterGivenAt: new Date().toISOString(),
            starterDeliveryInProgress: false,
            updatedAt: new Date(),
          },
        }
      );

      console.log(`[GACHA SERVICE] Starter entregado exitosamente a ${uuid}`);
      return { success: true };
    } catch (error) {
      console.error('[GACHA SERVICE] Error marcando entrega exitosa:', error);
      throw Errors.databaseError();
    }
  }

  /**
   * Marca la entrega del starter como fallida (permite reintentar)
   */
  async markDeliveryFailed(uuid: string, reason: string): Promise<{ success: boolean }> {
    try {
      await this.usersCollection.updateOne(
        { minecraftUuid: uuid },
        {
          $set: {
            starterDeliveryInProgress: false,
            updatedAt: new Date(),
          },
        }
      );

      console.warn(`[GACHA SERVICE] Entrega de starter fallida para ${uuid}: ${reason}`);
      return { success: true };
    } catch (error) {
      console.error('[GACHA SERVICE] Error marcando entrega fallida:', error);
      throw Errors.databaseError();
    }
  }

  /**
   * Obtiene el estado de entrega del starter
   */
  async getDeliveryStatus(uuid: string): Promise<{
    hasStarter: boolean;
    starterGiven: boolean;
    deliveryInProgress: boolean;
    deliveryAttempts: number;
    starterId?: number;
    isShiny?: boolean;
  }> {
    try {
      const user = await this.usersCollection.findOne({ minecraftUuid: uuid });

      if (!user) {
        return {
          hasStarter: false,
          starterGiven: false,
          deliveryInProgress: false,
          deliveryAttempts: 0,
        };
      }

      return {
        hasStarter: user.starterId !== null,
        starterGiven: user.starterGiven,
        deliveryInProgress: user.starterDeliveryInProgress || false,
        deliveryAttempts: user.starterDeliveryAttempts || 0,
        starterId: user.starterId || undefined,
        isShiny: user.starterIsShiny,
      };
    } catch (error) {
      console.error('[GACHA SERVICE] Error obteniendo estado de entrega:', error);
      throw Errors.databaseError();
    }
  }
}
