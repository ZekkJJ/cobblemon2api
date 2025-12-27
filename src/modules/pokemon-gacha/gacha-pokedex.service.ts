/**
 * Gacha Pokedex Service
 * Cobblemon Los Pitufos - Backend API
 * 
 * Rastrea qué Pokémon ha obtenido cada jugador en el gacha
 */

import { Collection, ClientSession } from 'mongodb';
import { ObjectId } from 'mongodb';

export interface GachaPokedexEntry {
  _id?: ObjectId;
  playerId: string;
  obtainedPokemon: number[]; // Array de pokemonIds obtenidos
  shinyObtained: number[];   // Array de pokemonIds obtenidos como shiny
  firstObtainedDates: Record<number, Date>; // pokemonId -> fecha primera obtención
  totalUniqueCount: number;
  totalShinyCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PokedexStats {
  totalUnique: number;
  totalShiny: number;
  completionPercentage: number;
  shinyCompletionPercentage: number;
  recentObtained: Array<{
    pokemonId: number;
    isShiny: boolean;
    obtainedAt: Date;
  }>;
}

// Total de Pokémon en el pool (actualizar según el pool)
const TOTAL_POKEMON_IN_POOL = 400;

export class GachaPokedexService {
  constructor(private pokedexCollection: Collection<GachaPokedexEntry>) {}

  /**
   * Verifica si un Pokémon es duplicado para el jugador
   */
  async isDuplicate(
    playerId: string,
    pokemonId: number,
    isShiny: boolean,
    session?: ClientSession
  ): Promise<boolean> {
    const entry = await this.pokedexCollection.findOne(
      { playerId },
      { session }
    );

    if (!entry) return false;

    if (isShiny) {
      return entry.shinyObtained.includes(pokemonId);
    }

    return entry.obtainedPokemon.includes(pokemonId);
  }

  /**
   * Registra un Pokémon obtenido
   */
  async registerPokemon(
    playerId: string,
    pokemonId: number,
    isShiny: boolean,
    session?: ClientSession
  ): Promise<{
    isNew: boolean;
    isNewShiny: boolean;
    totalUnique: number;
    totalShiny: number;
  }> {
    const now = new Date();
    const entry = await this.pokedexCollection.findOne({ playerId }, { session });

    let isNew = false;
    let isNewShiny = false;

    if (!entry) {
      // Primera entrada del jugador
      const newEntry: GachaPokedexEntry = {
        playerId,
        obtainedPokemon: [pokemonId],
        shinyObtained: isShiny ? [pokemonId] : [],
        firstObtainedDates: { [pokemonId]: now },
        totalUniqueCount: 1,
        totalShinyCount: isShiny ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      };

      await this.pokedexCollection.insertOne(newEntry, { session });

      return {
        isNew: true,
        isNewShiny: isShiny,
        totalUnique: 1,
        totalShiny: isShiny ? 1 : 0,
      };
    }

    // Verificar si es nuevo
    isNew = !entry.obtainedPokemon.includes(pokemonId);
    isNewShiny = isShiny && !entry.shinyObtained.includes(pokemonId);

    const updateOps: any = {
      $set: { updatedAt: now },
    };

    if (isNew) {
      updateOps.$addToSet = { obtainedPokemon: pokemonId };
      updateOps.$inc = { totalUniqueCount: 1 };
      updateOps.$set[`firstObtainedDates.${pokemonId}`] = now;
    }

    if (isNewShiny) {
      if (!updateOps.$addToSet) updateOps.$addToSet = {};
      updateOps.$addToSet.shinyObtained = pokemonId;
      if (!updateOps.$inc) updateOps.$inc = {};
      updateOps.$inc.totalShinyCount = 1;
    }

    if (isNew || isNewShiny) {
      await this.pokedexCollection.updateOne(
        { playerId },
        updateOps,
        { session }
      );
    }

    return {
      isNew,
      isNewShiny,
      totalUnique: entry.totalUniqueCount + (isNew ? 1 : 0),
      totalShiny: entry.totalShinyCount + (isNewShiny ? 1 : 0),
    };
  }

  /**
   * Obtiene la Pokédex completa de un jugador
   */
  async getPokedex(playerId: string, session?: ClientSession): Promise<GachaPokedexEntry | null> {
    return await this.pokedexCollection.findOne({ playerId }, { session });
  }

  /**
   * Obtiene estadísticas de la Pokédex
   */
  async getPokedexStats(playerId: string): Promise<PokedexStats> {
    const entry = await this.pokedexCollection.findOne({ playerId });

    if (!entry) {
      return {
        totalUnique: 0,
        totalShiny: 0,
        completionPercentage: 0,
        shinyCompletionPercentage: 0,
        recentObtained: [],
      };
    }

    // Obtener los 10 más recientes
    const recentObtained = Object.entries(entry.firstObtainedDates)
      .map(([pokemonId, date]) => ({
        pokemonId: parseInt(pokemonId),
        isShiny: entry.shinyObtained.includes(parseInt(pokemonId)),
        obtainedAt: date,
      }))
      .sort((a, b) => b.obtainedAt.getTime() - a.obtainedAt.getTime())
      .slice(0, 10);

    return {
      totalUnique: entry.totalUniqueCount,
      totalShiny: entry.totalShinyCount,
      completionPercentage: Math.round((entry.totalUniqueCount / TOTAL_POKEMON_IN_POOL) * 100 * 10) / 10,
      shinyCompletionPercentage: Math.round((entry.totalShinyCount / TOTAL_POKEMON_IN_POOL) * 100 * 10) / 10,
      recentObtained,
    };
  }

  /**
   * Verifica si el jugador tiene un Pokémon específico
   */
  async hasPokemon(
    playerId: string,
    pokemonId: number,
    shinyOnly: boolean = false
  ): Promise<boolean> {
    const entry = await this.pokedexCollection.findOne({ playerId });

    if (!entry) return false;

    if (shinyOnly) {
      return entry.shinyObtained.includes(pokemonId);
    }

    return entry.obtainedPokemon.includes(pokemonId);
  }

  /**
   * Obtiene la lista de Pokémon faltantes
   */
  async getMissingPokemon(
    playerId: string,
    allPokemonIds: number[]
  ): Promise<number[]> {
    const entry = await this.pokedexCollection.findOne({ playerId });

    if (!entry) return allPokemonIds;

    return allPokemonIds.filter(id => !entry.obtainedPokemon.includes(id));
  }

  /**
   * Obtiene el ranking de completitud de Pokédex
   */
  async getCompletionRanking(limit: number = 10): Promise<Array<{
    playerId: string;
    totalUnique: number;
    totalShiny: number;
    completionPercentage: number;
  }>> {
    const results = await this.pokedexCollection
      .find({})
      .sort({ totalUniqueCount: -1, totalShinyCount: -1 })
      .limit(limit)
      .toArray();

    return results.map(entry => ({
      playerId: entry.playerId,
      totalUnique: entry.totalUniqueCount,
      totalShiny: entry.totalShinyCount,
      completionPercentage: Math.round((entry.totalUniqueCount / TOTAL_POKEMON_IN_POOL) * 100 * 10) / 10,
    }));
  }
}