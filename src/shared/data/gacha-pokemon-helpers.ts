/**
 * Helper functions for Pokemon Gacha
 * Cobblemon Los Pitufos - Backend API
 */

import { PokemonPoolEntry, Rarity } from '../types/pokemon-gacha.types.js';
import { 
  COMMON_POKEMON, 
  UNCOMMON_POKEMON, 
  RARE_POKEMON
} from './gacha-pokemon-pool.data.js';

/**
 * Pokémon Épicos (5% probabilidad base)
 */
export const EPIC_POKEMON: PokemonPoolEntry[] = [
  { pokemonId: 143, name: 'Snorlax', nameEs: 'Snorlax', rarity: 'epic', baseWeight: 0.5, types: ['Normal'] },
  { pokemonId: 149, name: 'Dragonite', nameEs: 'Dragonite', rarity: 'epic', baseWeight: 0.5, types: ['Dragon', 'Flying'] },
  { pokemonId: 248, name: 'Tyranitar', nameEs: 'Tyranitar', rarity: 'epic', baseWeight: 0.5, types: ['Rock', 'Dark'] },
  { pokemonId: 373, name: 'Salamence', nameEs: 'Salamence', rarity: 'epic', baseWeight: 0.5, types: ['Dragon', 'Flying'] },
  { pokemonId: 376, name: 'Metagross', nameEs: 'Metagross', rarity: 'epic', baseWeight: 0.5, types: ['Steel', 'Psychic'] },
  { pokemonId: 445, name: 'Garchomp', nameEs: 'Garchomp', rarity: 'epic', baseWeight: 0.5, types: ['Dragon', 'Ground'] },
  { pokemonId: 635, name: 'Hydreigon', nameEs: 'Hydreigon', rarity: 'epic', baseWeight: 0.5, types: ['Dark', 'Dragon'] },
  { pokemonId: 706, name: 'Goodra', nameEs: 'Goodra', rarity: 'epic', baseWeight: 0.5, types: ['Dragon'] },
  { pokemonId: 784, name: 'Kommo-o', nameEs: 'Kommo-o', rarity: 'epic', baseWeight: 0.5, types: ['Dragon', 'Fighting'] },
  { pokemonId: 887, name: 'Dragapult', nameEs: 'Dragapult', rarity: 'epic', baseWeight: 0.5, types: ['Dragon', 'Ghost'] },
];

/**
 * Pokémon Legendarios (0.5% probabilidad base)
 */
export const LEGENDARY_POKEMON_POOL: PokemonPoolEntry[] = [
  { pokemonId: 144, name: 'Articuno', nameEs: 'Articuno', rarity: 'legendary', baseWeight: 0.3, types: ['Ice', 'Flying'] },
  { pokemonId: 145, name: 'Zapdos', nameEs: 'Zapdos', rarity: 'legendary', baseWeight: 0.3, types: ['Electric', 'Flying'] },
  { pokemonId: 146, name: 'Moltres', nameEs: 'Moltres', rarity: 'legendary', baseWeight: 0.3, types: ['Fire', 'Flying'] },
  { pokemonId: 150, name: 'Mewtwo', nameEs: 'Mewtwo', rarity: 'legendary', baseWeight: 0.2, types: ['Psychic'] },
  { pokemonId: 243, name: 'Raikou', nameEs: 'Raikou', rarity: 'legendary', baseWeight: 0.3, types: ['Electric'] },
  { pokemonId: 244, name: 'Entei', nameEs: 'Entei', rarity: 'legendary', baseWeight: 0.3, types: ['Fire'] },
  { pokemonId: 245, name: 'Suicune', nameEs: 'Suicune', rarity: 'legendary', baseWeight: 0.3, types: ['Water'] },
  { pokemonId: 249, name: 'Lugia', nameEs: 'Lugia', rarity: 'legendary', baseWeight: 0.2, types: ['Psychic', 'Flying'] },
  { pokemonId: 250, name: 'Ho-Oh', nameEs: 'Ho-Oh', rarity: 'legendary', baseWeight: 0.2, types: ['Fire', 'Flying'] },
  { pokemonId: 382, name: 'Kyogre', nameEs: 'Kyogre', rarity: 'legendary', baseWeight: 0.2, types: ['Water'] },
  { pokemonId: 383, name: 'Groudon', nameEs: 'Groudon', rarity: 'legendary', baseWeight: 0.2, types: ['Ground'] },
  { pokemonId: 384, name: 'Rayquaza', nameEs: 'Rayquaza', rarity: 'legendary', baseWeight: 0.15, types: ['Dragon', 'Flying'] },
  { pokemonId: 483, name: 'Dialga', nameEs: 'Dialga', rarity: 'legendary', baseWeight: 0.2, types: ['Steel', 'Dragon'] },
  { pokemonId: 484, name: 'Palkia', nameEs: 'Palkia', rarity: 'legendary', baseWeight: 0.2, types: ['Water', 'Dragon'] },
  { pokemonId: 487, name: 'Giratina', nameEs: 'Giratina', rarity: 'legendary', baseWeight: 0.2, types: ['Ghost', 'Dragon'] },
];

/**
 * Pokémon Míticos (0.1% probabilidad base)
 */
export const MYTHIC_POKEMON: PokemonPoolEntry[] = [
  { pokemonId: 151, name: 'Mew', nameEs: 'Mew', rarity: 'mythic', baseWeight: 0.1, types: ['Psychic'] },
  { pokemonId: 251, name: 'Celebi', nameEs: 'Celebi', rarity: 'mythic', baseWeight: 0.1, types: ['Psychic', 'Grass'] },
  { pokemonId: 385, name: 'Jirachi', nameEs: 'Jirachi', rarity: 'mythic', baseWeight: 0.1, types: ['Steel', 'Psychic'] },
  { pokemonId: 386, name: 'Deoxys', nameEs: 'Deoxys', rarity: 'mythic', baseWeight: 0.1, types: ['Psychic'] },
  { pokemonId: 493, name: 'Arceus', nameEs: 'Arceus', rarity: 'mythic', baseWeight: 0.05, types: ['Normal'] },
];

/**
 * Pool completo de todos los Pokémon
 */
export const ALL_POKEMON_POOL: PokemonPoolEntry[] = [
  ...COMMON_POKEMON,
  ...UNCOMMON_POKEMON,
  ...RARE_POKEMON,
  ...EPIC_POKEMON,
  ...LEGENDARY_POKEMON_POOL,
  ...MYTHIC_POKEMON,
];

/**
 * Obtiene la URL del sprite de un Pokémon
 */
export function getPokemonSprite(pokemonId: number, isShiny: boolean = false): string {
  const baseUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
  if (isShiny) {
    return `${baseUrl}/shiny/${pokemonId}.png`;
  }
  return `${baseUrl}/${pokemonId}.png`;
}

/**
 * Obtiene la URL del artwork oficial de un Pokémon
 */
export function getPokemonArtwork(pokemonId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
}

/**
 * Pool completo de Pokémon por rareza
 */
export const POKEMON_POOL_BY_RARITY: Record<Rarity, PokemonPoolEntry[]> = {
  common: COMMON_POKEMON,
  uncommon: UNCOMMON_POKEMON,
  rare: RARE_POKEMON,
  epic: EPIC_POKEMON,
  legendary: LEGENDARY_POKEMON_POOL,
  mythic: MYTHIC_POKEMON,
};

/**
 * Busca un Pokémon por ID
 */
export function findPokemonById(pokemonId: number): PokemonPoolEntry | undefined {
  return ALL_POKEMON_POOL.find(p => p.pokemonId === pokemonId);
}

/**
 * Busca un Pokémon por nombre
 */
export function findPokemonByName(name: string): PokemonPoolEntry | undefined {
  const normalizedName = name.toLowerCase();
  return ALL_POKEMON_POOL.find(
    p => p.name.toLowerCase() === normalizedName || 
         (p.nameEs && p.nameEs.toLowerCase() === normalizedName)
  );
}
