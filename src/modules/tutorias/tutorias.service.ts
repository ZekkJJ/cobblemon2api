import mongoose from 'mongoose';

export class TutoriasService {
  /**
   * Get user's team data for AI Tutor context
   */
  async getUserTeamData(discordId: string): Promise<any[]> {
    try {
      const db = mongoose.connection.db;
      if (!db) return [];

      // Get user's verified Minecraft UUID
      const user = await db.collection('users').findOne({ discordId });
      if (!user?.minecraftUuid) return [];

      // Get player's party Pokemon
      const player = await db.collection('players').findOne({ uuid: user.minecraftUuid });
      if (!player?.party) return [];

      return player.party.map((pokemon: any) => ({
        species: pokemon.species,
        nickname: pokemon.nickname,
        level: pokemon.level,
        nature: pokemon.nature,
        ability: pokemon.ability,
        moves: pokemon.moves,
        ivs: pokemon.ivs,
        evs: pokemon.evs,
        heldItem: pokemon.heldItem,
        shiny: pokemon.shiny
      }));
    } catch (error) {
      console.error('Error getting user team data:', error);
      return [];
    }
  }

  /**
   * Get user's Pokemon available for breeding
   */
  async getUserPokemonForBreeding(discordId: string): Promise<any[]> {
    try {
      const db = mongoose.connection.db;
      if (!db) return [];

      // Get user's verified Minecraft UUID
      const user = await db.collection('users').findOne({ discordId });
      if (!user?.minecraftUuid) return [];

      // Get player's PC Pokemon
      const player = await db.collection('players').findOne({ uuid: user.minecraftUuid });
      if (!player?.pc) return [];

      // Flatten PC boxes and filter breedable Pokemon
      const allPokemon: any[] = [];
      
      if (Array.isArray(player.pc)) {
        for (const box of player.pc) {
          if (box?.pokemon && Array.isArray(box.pokemon)) {
            allPokemon.push(...box.pokemon);
          }
        }
      }

      // Also include party Pokemon
      if (player.party && Array.isArray(player.party)) {
        allPokemon.push(...player.party);
      }

      return allPokemon.map((pokemon: any) => ({
        uuid: pokemon.uuid,
        species: pokemon.species,
        gender: pokemon.gender,
        nature: pokemon.nature,
        ability: pokemon.ability,
        ivs: pokemon.ivs,
        eggGroups: pokemon.eggGroups,
        shiny: pokemon.shiny,
        originalTrainer: pokemon.originalTrainer
      }));
    } catch (error) {
      console.error('Error getting user Pokemon for breeding:', error);
      return [];
    }
  }

  /**
   * Get a specific Pokemon by UUID
   */
  async getPokemonByUuid(discordId: string, pokemonUuid: string): Promise<any | null> {
    try {
      const db = mongoose.connection.db;
      if (!db) return null;

      // Get user's verified Minecraft UUID
      const user = await db.collection('users').findOne({ discordId });
      if (!user?.minecraftUuid) return null;

      // Get player data
      const player = await db.collection('players').findOne({ uuid: user.minecraftUuid });
      if (!player) return null;

      // Search in party
      if (player.party && Array.isArray(player.party)) {
        const found = player.party.find((p: any) => p.uuid === pokemonUuid);
        if (found) return found;
      }

      // Search in PC
      if (player.pc && Array.isArray(player.pc)) {
        for (const box of player.pc) {
          if (box?.pokemon && Array.isArray(box.pokemon)) {
            const found = box.pokemon.find((p: any) => p.uuid === pokemonUuid);
            if (found) return found;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting Pokemon by UUID:', error);
      return null;
    }
  }

  /**
   * Get user's balance
   */
  async getUserBalance(discordId: string): Promise<number> {
    try {
      const db = mongoose.connection.db;
      if (!db) return 0;

      const user = await db.collection('users').findOne({ discordId });
      return user?.balance || 0;
    } catch (error) {
      console.error('Error getting user balance:', error);
      return 0;
    }
  }

  /**
   * Update user's balance
   */
  async updateUserBalance(discordId: string, newBalance: number): Promise<boolean> {
    try {
      const db = mongoose.connection.db;
      if (!db) return false;

      await db.collection('users').updateOne(
        { discordId },
        { $set: { balance: newBalance } }
      );
      return true;
    } catch (error) {
      console.error('Error updating user balance:', error);
      return false;
    }
  }

  /**
   * Get user's Minecraft UUID
   */
  async getUserMinecraftUuid(discordId: string): Promise<string | null> {
    try {
      const db = mongoose.connection.db;
      if (!db) return null;

      const user = await db.collection('users').findOne({ discordId });
      return user?.minecraftUuid || null;
    } catch (error) {
      console.error('Error getting user Minecraft UUID:', error);
      return null;
    }
  }
}
