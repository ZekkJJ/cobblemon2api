import mongoose from 'mongoose';
import { ProtectedPokemonModel } from './tutorias.schema';
import { 
  PokeBoxFilters, 
  PokemonWithCalculations, 
  DuplicateGroup,
  PokemonStats 
} from '../../shared/types/tutorias.types';
import { StatCalculatorService } from './stat-calculator.service';

export class PokeBoxService {
  private statCalculator: StatCalculatorService;

  constructor() {
    this.statCalculator = new StatCalculatorService();
  }

  /**
   * Get all Pokemon from user's PC with calculations
   * Property 9: Filter Correctness - all returned Pokemon match filter conditions
   */
  async getPokeBox(discordId: string, filters: any = {}): Promise<PokemonWithCalculations[]> {
    const db = mongoose.connection.db;
    if (!db) return [];

    // Get user's Minecraft UUID
    const user = await db.collection('users').findOne({ discordId });
    if (!user?.minecraftUuid) return [];

    // Get player data
    const player = await db.collection('players').findOne({ uuid: user.minecraftUuid });
    if (!player) return [];

    // Get protected Pokemon
    const protectedPokemon = await ProtectedPokemonModel.find({ discordId });
    const protectedUuids = new Set(protectedPokemon.map(p => p.pokemonUuid));

    // Collect all Pokemon from PC
    const allPokemon: any[] = [];
    
    if (player.pc && Array.isArray(player.pc)) {
      for (const box of player.pc) {
        if (box?.pokemon && Array.isArray(box.pokemon)) {
          allPokemon.push(...box.pokemon);
        }
      }
    }

    // Transform and calculate
    let result = allPokemon.map(pokemon => this.transformPokemon(pokemon, protectedUuids));

    // Apply filters
    result = this.applyFilters(result, filters);

    return result;
  }

  /**
   * Get duplicate Pokemon grouped by species
   * Property 10: Duplicate Grouping - Pokemon grouped by same speciesId
   * Property 11: Protection Exclusion - protected Pokemon excluded from release suggestions
   */
  async getDuplicates(discordId: string): Promise<DuplicateGroup[]> {
    const allPokemon = await this.getPokeBox(discordId);

    // Group by species
    const groups = new Map<string, PokemonWithCalculations[]>();
    
    for (const pokemon of allPokemon) {
      const key = pokemon.species.toLowerCase();
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(pokemon);
    }

    // Filter to only groups with duplicates (2+ Pokemon)
    const duplicateGroups: DuplicateGroup[] = [];
    
    for (const [species, pokemon] of groups) {
      if (pokemon.length >= 2) {
        // Sort by IV percentage descending
        pokemon.sort((a, b) => b.ivPercentage - a.ivPercentage);
        
        // Find best non-protected Pokemon to suggest keeping
        const suggestedKeep = pokemon.find(p => !p.isProtected)?.uuid || pokemon[0].uuid;

        duplicateGroups.push({
          species: pokemon[0].species,
          speciesId: this.getSpeciesId(pokemon[0].species),
          pokemon,
          suggestedKeep
        });
      }
    }

    // Sort by number of duplicates descending
    duplicateGroups.sort((a, b) => b.pokemon.length - a.pokemon.length);

    return duplicateGroups;
  }

  /**
   * Update protection status for a Pokemon
   */
  async updateProtection(discordId: string, pokemonUuid: string, isProtected: boolean): Promise<void> {
    if (isProtected) {
      await ProtectedPokemonModel.findOneAndUpdate(
        { discordId, pokemonUuid },
        { $set: { protectedAt: new Date() } },
        { upsert: true }
      );
    } else {
      await ProtectedPokemonModel.deleteOne({ discordId, pokemonUuid });
    }
  }

  /**
   * Get all protected Pokemon UUIDs for a user
   */
  async getProtectedPokemon(discordId: string): Promise<string[]> {
    const protected_ = await ProtectedPokemonModel.find({ discordId });
    return protected_.map(p => p.pokemonUuid);
  }

  /**
   * Transform raw Pokemon data to PokemonWithCalculations
   */
  private transformPokemon(pokemon: any, protectedUuids: Set<string>): PokemonWithCalculations {
    const ivs: PokemonStats = {
      hp: pokemon.ivs?.hp || 0,
      attack: pokemon.ivs?.attack || 0,
      defense: pokemon.ivs?.defense || 0,
      specialAttack: pokemon.ivs?.specialAttack || pokemon.ivs?.spAtk || 0,
      specialDefense: pokemon.ivs?.specialDefense || pokemon.ivs?.spDef || 0,
      speed: pokemon.ivs?.speed || 0
    };

    const evs: PokemonStats = {
      hp: pokemon.evs?.hp || 0,
      attack: pokemon.evs?.attack || 0,
      defense: pokemon.evs?.defense || 0,
      specialAttack: pokemon.evs?.specialAttack || pokemon.evs?.spAtk || 0,
      specialDefense: pokemon.evs?.specialDefense || pokemon.evs?.spDef || 0,
      speed: pokemon.evs?.speed || 0
    };

    // Property 12: IV Percentage Calculation - (sum of IVs / 186) * 100
    const ivPercentage = this.statCalculator.calculateIVPercentage(ivs);
    
    // Property 13: EV Remaining Calculation - 510 - sum of EVs
    const evRemaining = this.statCalculator.calculateEVRemaining(evs);

    return {
      uuid: pokemon.uuid || '',
      species: pokemon.species || 'Unknown',
      nickname: pokemon.nickname,
      level: pokemon.level || 1,
      nature: pokemon.nature || 'Hardy',
      ability: pokemon.ability || 'Unknown',
      moves: pokemon.moves || [],
      ivs,
      evs,
      shiny: pokemon.shiny || false,
      ivPercentage,
      evRemaining,
      isProtected: protectedUuids.has(pokemon.uuid)
    };
  }

  /**
   * Apply filters to Pokemon list
   * Property 9: Filter Correctness - all returned Pokemon match ALL filter conditions
   */
  private applyFilters(pokemon: PokemonWithCalculations[], filters: any): PokemonWithCalculations[] {
    return pokemon.filter(p => {
      // Species filter
      if (filters.species && !p.species.toLowerCase().includes(filters.species.toLowerCase())) {
        return false;
      }

      // Type filter (would need type data)
      // if (filters.types && filters.types.length > 0) { ... }

      // Shiny filter
      if (filters.shiny !== undefined && filters.shiny !== '' && p.shiny !== (filters.shiny === 'true' || filters.shiny === true)) {
        return false;
      }

      // IV percentage range
      if (filters.ivMin !== undefined && p.ivPercentage < parseFloat(filters.ivMin)) {
        return false;
      }
      if (filters.ivMax !== undefined && p.ivPercentage > parseFloat(filters.ivMax)) {
        return false;
      }

      // EV total range
      if (filters.evMin !== undefined) {
        const evTotal = 510 - p.evRemaining;
        if (evTotal < parseFloat(filters.evMin)) return false;
      }
      if (filters.evMax !== undefined) {
        const evTotal = 510 - p.evRemaining;
        if (evTotal > parseFloat(filters.evMax)) return false;
      }

      // Nature filter
      if (filters.nature && p.nature.toLowerCase() !== filters.nature.toLowerCase()) {
        return false;
      }

      // Ability filter
      if (filters.ability && !p.ability.toLowerCase().includes(filters.ability.toLowerCase())) {
        return false;
      }

      // Level range
      if (filters.levelMin !== undefined && p.level < parseInt(filters.levelMin)) {
        return false;
      }
      if (filters.levelMax !== undefined && p.level > parseInt(filters.levelMax)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get species ID from name (simplified - would need proper Pokedex data)
   */
  private getSpeciesId(species: string): number {
    // This would ideally look up from a Pokedex database
    // For now, return a hash-based ID
    let hash = 0;
    for (let i = 0; i < species.length; i++) {
      hash = ((hash << 5) - hash) + species.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % 1000;
  }
}
