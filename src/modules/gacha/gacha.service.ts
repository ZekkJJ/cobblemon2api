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
    const db = await getDb();
    const session = db.client.startSession();

    try {
      let result: RollResult | null = null;

      await session.withTransaction(async () => {
        // Buscar o crear usuario
        let user = await this.usersCollection.findOne({ discordId }, { session });

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

          const insertResult = await this.usersCollection.insertOne(newUser as User, { session });
          user = { ...newUser, _id: insertResult.insertedId } as any;
        }

        // Verificar si ya hizo tirada
        if (user && user.starterId !== null) {
          throw Errors.alreadyRolled();
        }

        // Obtener starters disponibles
        const claimedStarters = await this.startersCollection.find({ isClaimed: true }, { session }).toArray();
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
              updatedAt: new Date(),
            },
          },
          { session }
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
          { upsert: true, session }
        );

        // Obtener sprites
        const sprites = getStarterSprites(selectedStarter.pokemonId, isShiny);

        result = {
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
      });

      if (!result) {
        throw new Error('La transacción no produjo resultado');
      }

      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('[GACHA SERVICE] Error en tirada clásica:', error);
      throw Errors.internal('Error durante la tirada. Por favor intenta de nuevo.');
    } finally {
      await session.endSession();
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
}
