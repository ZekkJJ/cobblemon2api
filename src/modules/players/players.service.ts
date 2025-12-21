/**
 * Servicio de Jugadores
 * Cobblemon Los Pitufos - Backend API
 * 
 * Maneja la lógica de negocio relacionada con jugadores
 */

import { Collection } from 'mongodb';
import { User, Pokemon, PCBox } from '../../shared/types/user.types.js';
import { Starter } from '../../shared/types/pokemon.types.js';
import { PlayerSyncInput, StarterGivenInput } from './players.schema.js';
import { AppError, Errors } from '../../shared/middleware/error-handler.js';
import { STARTERS_DATA } from '../../shared/data/starters.data.js';

/**
 * Resumen de jugador para listado
 */
export interface PlayerSummary {
  uuid: string;
  username: string;
  totalPokemon: number;
  shinies: number;
  partyPreview: Array<{
    species: string;
    speciesId: number;
    level: number;
    shiny: boolean;
  }>;
  starter: {
    id: number;
    name: string;
    isShiny: boolean;
  } | null;
  lastSync: string;
}

/**
 * Perfil completo de jugador
 */
export interface PlayerProfile {
  uuid: string;
  username: string;
  lastSync: string;
  party: Pokemon[];
  pc: PCBox[];
  stats: {
    totalPokemon: number;
    uniqueSpecies: number;
    shinies: number;
    avgLevel: number;
    strongestPokemon: Pokemon | null;
  };
}

export class PlayersService {
  constructor(
    private usersCollection: Collection<User>,
    private startersCollection: Collection<Starter>
  ) {}

  /**
   * Obtiene lista de todos los jugadores con resumen
   */
  async getAllPlayers(): Promise<PlayerSummary[]> {
    try {
      const users = await this.usersCollection.find({}).toArray();
      
      // Filtrar solo jugadores relevantes (con UUID de Minecraft o starter)
      const relevantPlayers = users.filter(u => u.minecraftUuid || u.starterId);

      // Transformar a formato de resumen
      const summaries: PlayerSummary[] = relevantPlayers.map(user => {
        let starterInfo = null;
        if (user.starterId) {
          const starterData = STARTERS_DATA.find(s => s.pokemonId === user.starterId);
          if (starterData) {
            starterInfo = {
              id: user.starterId,
              name: starterData.nameEs || starterData.name,
              isShiny: user.starterIsShiny || false,
            };
          }
        }

        const party = user.pokemonParty || [];

        return {
          uuid: user.minecraftUuid || user.discordId || 'unknown',
          username: user.minecraftUsername || user.nickname || user.discordUsername || 'Desconocido',
          totalPokemon: party.length,
          shinies: party.filter(p => p.shiny).length,
          partyPreview: party.slice(0, 6).map(poke => ({
            species: poke.species,
            speciesId: poke.speciesId,
            level: poke.level,
            shiny: poke.shiny,
          })),
          starter: starterInfo,
          lastSync: user.syncedAt || user.minecraftLastSeen || new Date().toISOString(),
        };
      });

      return summaries;
    } catch (error) {
      console.error('[PLAYERS SERVICE] Error obteniendo jugadores:', error);
      throw Errors.databaseError();
    }
  }

  /**
   * Obtiene el perfil completo de un jugador por UUID
   */
  async getPlayerProfile(uuid: string): Promise<PlayerProfile> {
    try {
      // Buscar por minecraftUuid o discordId
      const user = await this.usersCollection.findOne({
        $or: [
          { minecraftUuid: uuid },
          { discordId: uuid },
        ],
      });

      if (!user) {
        throw Errors.playerNotFound();
      }

      const party = user.pokemonParty || [];
      const pc = user.pcStorage || [];

      // Calcular estadísticas
      const allPokemon = [...party, ...pc.flatMap(box => box.pokemon)];
      const uniqueSpecies = new Set(allPokemon.map(p => p?.speciesId)).size;
      const shinies = allPokemon.filter(p => p?.shiny).length;
      const avgLevel = allPokemon.length > 0
        ? Math.round(allPokemon.reduce((sum, p) => sum + (p?.level || 0), 0) / allPokemon.length)
        : 0;
      const strongestPokemon = allPokemon.length > 0
        ? allPokemon.reduce((strongest, current) => 
            (current?.level || 0) > (strongest?.level || 0) ? current : strongest
          )
        : null;

      const profile: PlayerProfile = {
        uuid: user.minecraftUuid || user.discordId || uuid,
        username: user.minecraftUsername || user.nickname || user.discordUsername || 'Desconocido',
        lastSync: user.syncedAt || user.minecraftLastSeen || new Date().toISOString(),
        party,
        pc,
        stats: {
          totalPokemon: allPokemon.length,
          uniqueSpecies,
          shinies,
          avgLevel,
          strongestPokemon,
        },
      };

      return profile;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('[PLAYERS SERVICE] Error obteniendo perfil:', error);
      throw Errors.databaseError();
    }
  }

  /**
   * Sincroniza datos de un jugador desde el plugin de Minecraft
   */
  async syncPlayerData(data: PlayerSyncInput): Promise<{ success: boolean; banned: boolean; banReason?: string }> {
    try {
      const { uuid, username, online, lastSeen, party, pcStorage, cobbleDollarsBalance } = data;

      // Preparar datos de actualización
      const updateData: Partial<User> = {
        minecraftUsername: username,
        nickname: username,
        minecraftOnline: online || false,
        minecraftLastSeen: lastSeen || new Date().toISOString(),
        cobbleDollarsBalance: cobbleDollarsBalance || 0,
        syncedAt: new Date().toISOString(),
        updatedAt: new Date(),
      };

      // Solo incluir datos pesados si existen
      if (party && party.length > 0) {
        updateData.pokemonParty = party.slice(0, 6) as Pokemon[]; // Máximo 6 en party
      }
      if (pcStorage && pcStorage.length > 0) {
        updateData.pcStorage = pcStorage.slice(0, 2) as PCBox[]; // Solo primeras 2 cajas
      }

      // Buscar jugador existente
      const existing = await this.usersCollection.findOne({ minecraftUuid: uuid });

      if (existing) {
        // Actualizar jugador existente
        await this.usersCollection.updateOne(
          { minecraftUuid: uuid },
          { $set: updateData }
        );

        return {
          success: true,
          banned: existing.banned || false,
          banReason: existing.banReason,
        };
      } else {
        // Crear nuevo jugador (sin Discord aún)
        const newUser: Partial<User> = {
          discordId: null,
          discordUsername: '',
          minecraftUuid: uuid,
          ...updateData,
          pokemonParty: party?.slice(0, 6) as Pokemon[] || [],
          pcStorage: pcStorage?.slice(0, 2) as PCBox[] || [],
          starterId: null,
          starterIsShiny: false,
          starterGiven: false,
          rolledAt: null,
          isAdmin: false,
          banned: false,
          verified: false,
          createdAt: new Date(),
        };

        await this.usersCollection.insertOne(newUser as User);

        return {
          success: true,
          banned: false,
        };
      }
    } catch (error) {
      console.error('[PLAYERS SERVICE] Error sincronizando jugador:', error);
      throw Errors.databaseError();
    }
  }

  /**
   * Verifica si un jugador tiene un starter pendiente de entrega
   */
  async checkPendingStarter(uuid: string): Promise<{
    pending: boolean;
    pokemonId?: number;
    isShiny?: boolean;
  }> {
    try {
      const user = await this.usersCollection.findOne({ minecraftUuid: uuid });

      if (!user || !user.starterId) {
        return { pending: false };
      }

      // Verificar si ya fue entregado
      if (user.starterGiven) {
        return { pending: false };
      }

      return {
        pending: true,
        pokemonId: user.starterId,
        isShiny: user.starterIsShiny || false,
      };
    } catch (error) {
      console.error('[PLAYERS SERVICE] Error verificando starter pendiente:', error);
      return { pending: false };
    }
  }

  /**
   * Marca el starter como entregado
   */
  async markStarterAsGiven(data: StarterGivenInput): Promise<{ success: boolean }> {
    try {
      const { uuid, pokemonId, given } = data;

      // Obtener información del usuario
      const user = await this.usersCollection.findOne({ minecraftUuid: uuid });

      if (!user) {
        throw Errors.playerNotFound();
      }

      // Actualizar estado del starter en el usuario
      await this.usersCollection.updateOne(
        { minecraftUuid: uuid },
        {
          $set: {
            starterGiven: given !== false,
            starterGivenAt: new Date().toISOString(),
            updatedAt: new Date(),
          },
        }
      );

      // Si se está marcando como entregado y tenemos pokemonId, actualizar colección de starters
      if (given !== false && pokemonId) {
        const starterInfo = STARTERS_DATA.find(s => s.pokemonId === pokemonId);
        const nickname = user.minecraftUsername || user.nickname || user.discordUsername || 'Desconocido';

        await this.startersCollection.updateOne(
          { pokemonId },
          {
            $set: {
              pokemonId,
              name: starterInfo?.name || 'Unknown',
              isClaimed: true,
              claimedBy: user.discordId || uuid,
              claimedByNickname: nickname,
              minecraftUsername: user.minecraftUsername,
              claimedAt: new Date().toISOString(),
              starterIsShiny: user.starterIsShiny || false,
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );

        console.log('[PLAYERS SERVICE] Registrado reclamo de starter:', { uuid, pokemonId, nickname });
      }

      return { success: true };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('[PLAYERS SERVICE] Error marcando starter como entregado:', error);
      throw Errors.databaseError();
    }
  }

  /**
   * Obtiene el estado de verificación de un jugador
   */
  async getVerificationStatus(uuid: string): Promise<{
    verified: boolean;
    exists: boolean;
    discordLinked: boolean;
    banned: boolean;
  }> {
    try {
      const user = await this.usersCollection.findOne({ minecraftUuid: uuid });

      if (!user) {
        return {
          verified: false,
          exists: false,
          discordLinked: false,
          banned: false,
        };
      }

      return {
        verified: user.verified === true,
        exists: true,
        discordLinked: !!user.discordId,
        banned: user.banned || false,
      };
    } catch (error) {
      console.error('[PLAYERS SERVICE] Error obteniendo estado de verificación:', error);
      throw Errors.databaseError();
    }
  }

  /**
   * Obtiene el estado de ban de un jugador
   */
  async getBanStatus(uuid: string): Promise<{
    banned: boolean;
    banReason?: string;
    bannedAt?: string;
  }> {
    try {
      const user = await this.usersCollection.findOne({ minecraftUuid: uuid });

      if (!user) {
        return { banned: false };
      }

      return {
        banned: user.banned || false,
        banReason: user.banReason,
        bannedAt: user.bannedAt,
      };
    } catch (error) {
      console.error('[PLAYERS SERVICE] Error obteniendo estado de ban:', error);
      throw Errors.databaseError();
    }
  }
}
