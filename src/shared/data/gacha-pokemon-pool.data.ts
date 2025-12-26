/**
 * Pool de Pokémon para el Sistema Gacha
 * Cobblemon Los Pitufos - Backend API
 * 
 * Define los Pokémon disponibles en el gacha organizados por rareza
 */

import { PokemonPoolEntry, Rarity } from '../types/pokemon-gacha.types.js';

/**
 * Pokémon Comunes (60% probabilidad base)
 * Pokémon básicos de todas las generaciones
 */
export const COMMON_POKEMON: PokemonPoolEntry[] = [
  { pokemonId: 10, name: 'Caterpie', nameEs: 'Caterpie', rarity: 'common', baseWeight: 1, types: ['Bug'] },
  { pokemonId: 13, name: 'Weedle', nameEs: 'Weedle', rarity: 'common', baseWeight: 1, types: ['Bug', 'Poison'] },
  { pokemonId: 16, name: 'Pidgey', nameEs: 'Pidgey', rarity: 'common', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 19, name: 'Rattata', nameEs: 'Rattata', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 21, name: 'Spearow', nameEs: 'Spearow', rarity: 'common', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 29, name: 'Nidoran♀', nameEs: 'Nidoran♀', rarity: 'common', baseWeight: 1, types: ['Poison'] },
  { pokemonId: 32, name: 'Nidoran♂', nameEs: 'Nidoran♂', rarity: 'common', baseWeight: 1, types: ['Poison'] },
  { pokemonId: 41, name: 'Zubat', nameEs: 'Zubat', rarity: 'common', baseWeight: 1, types: ['Poison', 'Flying'] },
  { pokemonId: 43, name: 'Oddish', nameEs: 'Oddish', rarity: 'common', baseWeight: 1, types: ['Grass', 'Poison'] },
  { pokemonId: 46, name: 'Paras', nameEs: 'Paras', rarity: 'common', baseWeight: 1, types: ['Bug', 'Grass'] },
  { pokemonId: 48, name: 'Venonat', nameEs: 'Venonat', rarity: 'common', baseWeight: 1, types: ['Bug', 'Poison'] },
  { pokemonId: 50, name: 'Diglett', nameEs: 'Diglett', rarity: 'common', baseWeight: 1, types: ['Ground'] },
  { pokemonId: 52, name: 'Meowth', nameEs: 'Meowth', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 54, name: 'Psyduck', nameEs: 'Psyduck', rarity: 'common', baseWeight: 1, types: ['Water'] },
  { pokemonId: 56, name: 'Mankey', nameEs: 'Mankey', rarity: 'common', baseWeight: 1, types: ['Fighting'] },
];


/**
 * Pokémon Poco Comunes (25% probabilidad base)
 * Pokémon de primera evolución y algunos básicos más raros
 */
export const UNCOMMON_POKEMON: PokemonPoolEntry[] = [
  { pokemonId: 11, name: 'Metapod', nameEs: 'Metapod', rarity: 'uncommon', baseWeight: 1, types: ['Bug'] },
  { pokemonId: 14, name: 'Kakuna', nameEs: 'Kakuna', rarity: 'uncommon', baseWeight: 1, types: ['Bug', 'Poison'] },
  { pokemonId: 17, name: 'Pidgeotto', nameEs: 'Pidgeotto', rarity: 'uncommon', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 20, name: 'Raticate', nameEs: 'Raticate', rarity: 'uncommon', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 22, name: 'Fearow', nameEs: 'Fearow', rarity: 'uncommon', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 25, name: 'Pikachu', nameEs: 'Pikachu', rarity: 'uncommon', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 30, name: 'Nidorina', nameEs: 'Nidorina', rarity: 'uncommon', baseWeight: 1, types: ['Poison'] },
  { pokemonId: 33, name: 'Nidorino', nameEs: 'Nidorino', rarity: 'uncommon', baseWeight: 1, types: ['Poison'] },
  { pokemonId: 37, name: 'Vulpix', nameEs: 'Vulpix', rarity: 'uncommon', baseWeight: 1, types: ['Fire'] },
  { pokemonId: 39, name: 'Jigglypuff', nameEs: 'Jigglypuff', rarity: 'uncommon', baseWeight: 1, types: ['Normal', 'Fairy'] },
  { pokemonId: 42, name: 'Golbat', nameEs: 'Golbat', rarity: 'uncommon', baseWeight: 1, types: ['Poison', 'Flying'] },
  { pokemonId: 44, name: 'Gloom', nameEs: 'Gloom', rarity: 'uncommon', baseWeight: 1, types: ['Grass', 'Poison'] },
  { pokemonId: 55, name: 'Golduck', nameEs: 'Golduck', rarity: 'uncommon', baseWeight: 1, types: ['Water'] },
  { pokemonId: 57, name: 'Primeape', nameEs: 'Primeape', rarity: 'uncommon', baseWeight: 1, types: ['Fighting'] },
  { pokemonId: 58, name: 'Growlithe', nameEs: 'Growlithe', rarity: 'uncommon', baseWeight: 1, types: ['Fire'] },
  { pokemonId: 60, name: 'Poliwag', nameEs: 'Poliwag', rarity: 'uncommon', baseWeight: 1, types: ['Water'] },
  { pokemonId: 63, name: 'Abra', nameEs: 'Abra', rarity: 'uncommon', baseWeight: 1, types: ['Psychic'] },
  { pokemonId: 66, name: 'Machop', nameEs: 'Machop', rarity: 'uncommon', baseWeight: 1, types: ['Fighting'] },
  { pokemonId: 72, name: 'Tentacool', nameEs: 'Tentacool', rarity: 'uncommon', baseWeight: 1, types: ['Water', 'Poison'] },
  { pokemonId: 74, name: 'Geodude', nameEs: 'Geodude', rarity: 'uncommon', baseWeight: 1, types: ['Rock', 'Ground'] },
];

/**
 * Pokémon Raros (10% probabilidad base)
 * Pokémon de segunda evolución y algunos especiales
 */
export const RARE_POKEMON: PokemonPoolEntry[] = [
  { pokemonId: 12, name: 'Butterfree', nameEs: 'Butterfree', rarity: 'rare', baseWeight: 1, types: ['Bug', 'Flying'] },
  { pokemonId: 15, name: 'Beedrill', nameEs: 'Beedrill', rarity: 'rare', baseWeight: 1, types: ['Bug', 'Poison'] },
  { pokemonId: 18, name: 'Pidgeot', nameEs: 'Pidgeot', rarity: 'rare', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 26, name: 'Raichu', nameEs: 'Raichu', rarity: 'rare', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 31, name: 'Nidoqueen', nameEs: 'Nidoqueen', rarity: 'rare', baseWeight: 1, types: ['Poison', 'Ground'] },
  { pokemonId: 34, name: 'Nidoking', nameEs: 'Nidoking', rarity: 'rare', baseWeight: 1, types: ['Poison', 'Ground'] },
  { pokemonId: 38, name: 'Ninetales', nameEs: 'Ninetales', rarity: 'rare', baseWeight: 1, types: ['Fire'] },
  { pokemonId: 40, name: 'Wigglytuff', nameEs: 'Wigglytuff', rarity: 'rare', baseWeight: 1, types: ['Normal', 'Fairy'] },
  { pokemonId: 45, name: 'Vileplume', nameEs: 'Vileplume', rarity: 'rare', baseWeight: 1, types: ['Grass', 'Poison'] },
  { pokemonId: 59, name: 'Arcanine', nameEs: 'Arcanine', rarity: 'rare', baseWeight: 1, types: ['Fire'] },
  { pokemonId: 62, name: 'Poliwrath', nameEs: 'Poliwrath', rarity: 'rare', baseWeight: 1, types: ['Water', 'Fighting'] },
  { pokemonId: 64, name: 'Kadabra', nameEs: 'Kadabra', rarity: 'rare', baseWeight: 1, types: ['Psychic'] },
  { pokemonId: 67, name: 'Machoke', nameEs: 'Machoke', rarity: 'rare', baseWeight: 1, types: ['Fighting'] },
  { pokemonId: 73, name: 'Tentacruel', nameEs: 'Tentacruel', rarity: 'rare', baseWeight: 1, types: ['Water', 'Poison'] },
  { pokemonId: 75, name: 'Graveler', nameEs: 'Graveler', rarity: 'rare', baseWeight: 1, types: ['Rock', 'Ground'] },
  { pokemonId: 78, name: 'Rapidash', nameEs: 'Rapidash', rarity: 'rare', baseWeight: 1, types: ['Fire'] },
  { pokemonId: 82, name: 'Magneton', nameEs: 'Magneton', rarity: 'rare', baseWeight: 1, types: ['Electric', 'Steel'] },
  { pokemonId: 89, name: 'Muk', nameEs: 'Muk', rarity: 'rare', baseWeight: 1, types: ['Poison'] },
  { pokemonId: 91, name: 'Cloyster', nameEs: 'Cloyster', rarity: 'rare', baseWeight: 1, types: ['Water', 'Ice'] },
  { pokemonId: 94, name: 'Gengar', nameEs: 'Gengar', rarity: 'rare', baseWeight: 1, types: ['Ghost', 'Poison'] },
];


/**
 * Pokémon Épicos (4% probabilidad base)
 * Pokémon de evolución final fuertes y pseudo-legendarios
 */
export const EPIC_POKEMON: PokemonPoolEntry[] = [
  { pokemonId: 65, name: 'Alakazam', nameEs: 'Alakazam', rarity: 'epic', baseWeight: 1, types: ['Psychic'] },
  { pokemonId: 68, name: 'Machamp', nameEs: 'Machamp', rarity: 'epic', baseWeight: 1, types: ['Fighting'] },
  { pokemonId: 76, name: 'Golem', nameEs: 'Golem', rarity: 'epic', baseWeight: 1, types: ['Rock', 'Ground'] },
  { pokemonId: 103, name: 'Exeggutor', nameEs: 'Exeggutor', rarity: 'epic', baseWeight: 1, types: ['Grass', 'Psychic'] },
  { pokemonId: 112, name: 'Rhydon', nameEs: 'Rhydon', rarity: 'epic', baseWeight: 1, types: ['Ground', 'Rock'] },
  { pokemonId: 121, name: 'Starmie', nameEs: 'Starmie', rarity: 'epic', baseWeight: 1, types: ['Water', 'Psychic'] },
  { pokemonId: 130, name: 'Gyarados', nameEs: 'Gyarados', rarity: 'epic', baseWeight: 1, types: ['Water', 'Flying'] },
  { pokemonId: 131, name: 'Lapras', nameEs: 'Lapras', rarity: 'epic', baseWeight: 1, types: ['Water', 'Ice'] },
  { pokemonId: 134, name: 'Vaporeon', nameEs: 'Vaporeon', rarity: 'epic', baseWeight: 1, types: ['Water'] },
  { pokemonId: 135, name: 'Jolteon', nameEs: 'Jolteon', rarity: 'epic', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 136, name: 'Flareon', nameEs: 'Flareon', rarity: 'epic', baseWeight: 1, types: ['Fire'] },
  { pokemonId: 143, name: 'Snorlax', nameEs: 'Snorlax', rarity: 'epic', baseWeight: 1, types: ['Normal'] },
  // Pseudo-legendarios
  { pokemonId: 147, name: 'Dratini', nameEs: 'Dratini', rarity: 'epic', baseWeight: 0.5, types: ['Dragon'] },
  { pokemonId: 148, name: 'Dragonair', nameEs: 'Dragonair', rarity: 'epic', baseWeight: 0.3, types: ['Dragon'] },
  { pokemonId: 246, name: 'Larvitar', nameEs: 'Larvitar', rarity: 'epic', baseWeight: 0.5, types: ['Rock', 'Ground'] },
  { pokemonId: 247, name: 'Pupitar', nameEs: 'Pupitar', rarity: 'epic', baseWeight: 0.3, types: ['Rock', 'Ground'] },
  { pokemonId: 371, name: 'Bagon', nameEs: 'Bagon', rarity: 'epic', baseWeight: 0.5, types: ['Dragon'] },
  { pokemonId: 372, name: 'Shelgon', nameEs: 'Shelgon', rarity: 'epic', baseWeight: 0.3, types: ['Dragon'] },
  { pokemonId: 374, name: 'Beldum', nameEs: 'Beldum', rarity: 'epic', baseWeight: 0.5, types: ['Steel', 'Psychic'] },
  { pokemonId: 375, name: 'Metang', nameEs: 'Metang', rarity: 'epic', baseWeight: 0.3, types: ['Steel', 'Psychic'] },
  { pokemonId: 443, name: 'Gible', nameEs: 'Gible', rarity: 'epic', baseWeight: 0.5, types: ['Dragon', 'Ground'] },
  { pokemonId: 444, name: 'Gabite', nameEs: 'Gabite', rarity: 'epic', baseWeight: 0.3, types: ['Dragon', 'Ground'] },
  { pokemonId: 633, name: 'Deino', nameEs: 'Deino', rarity: 'epic', baseWeight: 0.5, types: ['Dark', 'Dragon'] },
  { pokemonId: 634, name: 'Zweilous', nameEs: 'Zweilous', rarity: 'epic', baseWeight: 0.3, types: ['Dark', 'Dragon'] },
];

/**
 * Pokémon Legendarios (0.6% probabilidad base)
 * Pseudo-legendarios finales y Pokémon muy raros
 */
export const LEGENDARY_POKEMON: PokemonPoolEntry[] = [
  // Pseudo-legendarios finales
  { pokemonId: 149, name: 'Dragonite', nameEs: 'Dragonite', rarity: 'legendary', baseWeight: 1, types: ['Dragon', 'Flying'] },
  { pokemonId: 248, name: 'Tyranitar', nameEs: 'Tyranitar', rarity: 'legendary', baseWeight: 1, types: ['Rock', 'Dark'] },
  { pokemonId: 373, name: 'Salamence', nameEs: 'Salamence', rarity: 'legendary', baseWeight: 1, types: ['Dragon', 'Flying'] },
  { pokemonId: 376, name: 'Metagross', nameEs: 'Metagross', rarity: 'legendary', baseWeight: 1, types: ['Steel', 'Psychic'] },
  { pokemonId: 445, name: 'Garchomp', nameEs: 'Garchomp', rarity: 'legendary', baseWeight: 1, types: ['Dragon', 'Ground'] },
  { pokemonId: 635, name: 'Hydreigon', nameEs: 'Hydreigon', rarity: 'legendary', baseWeight: 1, types: ['Dark', 'Dragon'] },
  { pokemonId: 706, name: 'Goodra', nameEs: 'Goodra', rarity: 'legendary', baseWeight: 1, types: ['Dragon'] },
  { pokemonId: 784, name: 'Kommo-o', nameEs: 'Kommo-o', rarity: 'legendary', baseWeight: 1, types: ['Dragon', 'Fighting'] },
  { pokemonId: 887, name: 'Dragapult', nameEs: 'Dragapult', rarity: 'legendary', baseWeight: 1, types: ['Dragon', 'Ghost'] },
  // Legendarios menores
  { pokemonId: 144, name: 'Articuno', nameEs: 'Articuno', rarity: 'legendary', baseWeight: 0.5, types: ['Ice', 'Flying'] },
  { pokemonId: 145, name: 'Zapdos', nameEs: 'Zapdos', rarity: 'legendary', baseWeight: 0.5, types: ['Electric', 'Flying'] },
  { pokemonId: 146, name: 'Moltres', nameEs: 'Moltres', rarity: 'legendary', baseWeight: 0.5, types: ['Fire', 'Flying'] },
  { pokemonId: 243, name: 'Raikou', nameEs: 'Raikou', rarity: 'legendary', baseWeight: 0.5, types: ['Electric'] },
  { pokemonId: 244, name: 'Entei', nameEs: 'Entei', rarity: 'legendary', baseWeight: 0.5, types: ['Fire'] },
  { pokemonId: 245, name: 'Suicune', nameEs: 'Suicune', rarity: 'legendary', baseWeight: 0.5, types: ['Water'] },
];


/**
 * Pokémon Míticos (0.0001% probabilidad base)
 * Legendarios de portada y míticos
 */
export const MYTHIC_POKEMON: PokemonPoolEntry[] = [
  // Legendarios de portada
  { pokemonId: 150, name: 'Mewtwo', nameEs: 'Mewtwo', rarity: 'mythic', baseWeight: 1, types: ['Psychic'] },
  { pokemonId: 249, name: 'Lugia', nameEs: 'Lugia', rarity: 'mythic', baseWeight: 1, types: ['Psychic', 'Flying'] },
  { pokemonId: 250, name: 'Ho-Oh', nameEs: 'Ho-Oh', rarity: 'mythic', baseWeight: 1, types: ['Fire', 'Flying'] },
  { pokemonId: 382, name: 'Kyogre', nameEs: 'Kyogre', rarity: 'mythic', baseWeight: 1, types: ['Water'] },
  { pokemonId: 383, name: 'Groudon', nameEs: 'Groudon', rarity: 'mythic', baseWeight: 1, types: ['Ground'] },
  { pokemonId: 384, name: 'Rayquaza', nameEs: 'Rayquaza', rarity: 'mythic', baseWeight: 1, types: ['Dragon', 'Flying'] },
  { pokemonId: 483, name: 'Dialga', nameEs: 'Dialga', rarity: 'mythic', baseWeight: 1, types: ['Steel', 'Dragon'] },
  { pokemonId: 484, name: 'Palkia', nameEs: 'Palkia', rarity: 'mythic', baseWeight: 1, types: ['Water', 'Dragon'] },
  { pokemonId: 487, name: 'Giratina', nameEs: 'Giratina', rarity: 'mythic', baseWeight: 1, types: ['Ghost', 'Dragon'] },
  // Míticos
  { pokemonId: 151, name: 'Mew', nameEs: 'Mew', rarity: 'mythic', baseWeight: 0.5, types: ['Psychic'] },
  { pokemonId: 251, name: 'Celebi', nameEs: 'Celebi', rarity: 'mythic', baseWeight: 0.5, types: ['Psychic', 'Grass'] },
  { pokemonId: 385, name: 'Jirachi', nameEs: 'Jirachi', rarity: 'mythic', baseWeight: 0.5, types: ['Steel', 'Psychic'] },
  { pokemonId: 386, name: 'Deoxys', nameEs: 'Deoxys', rarity: 'mythic', baseWeight: 0.5, types: ['Psychic'] },
  { pokemonId: 490, name: 'Manaphy', nameEs: 'Manaphy', rarity: 'mythic', baseWeight: 0.5, types: ['Water'] },
  { pokemonId: 491, name: 'Darkrai', nameEs: 'Darkrai', rarity: 'mythic', baseWeight: 0.5, types: ['Dark'] },
  { pokemonId: 492, name: 'Shaymin', nameEs: 'Shaymin', rarity: 'mythic', baseWeight: 0.5, types: ['Grass'] },
  { pokemonId: 493, name: 'Arceus', nameEs: 'Arceus', rarity: 'mythic', baseWeight: 0.1, types: ['Normal'] },
];

/**
 * Pool completo de Pokémon por rareza
 */
export const POKEMON_POOL_BY_RARITY: Record<Rarity, PokemonPoolEntry[]> = {
  common: COMMON_POKEMON,
  uncommon: UNCOMMON_POKEMON,
  rare: RARE_POKEMON,
  epic: EPIC_POKEMON,
  legendary: LEGENDARY_POKEMON,
  mythic: MYTHIC_POKEMON,
};

/**
 * Pool completo de todos los Pokémon
 */
export const ALL_POKEMON_POOL: PokemonPoolEntry[] = [
  ...COMMON_POKEMON,
  ...UNCOMMON_POKEMON,
  ...RARE_POKEMON,
  ...EPIC_POKEMON,
  ...LEGENDARY_POKEMON,
  ...MYTHIC_POKEMON,
];

/**
 * Obtiene el pool de Pokémon para una rareza específica
 */
export function getPokemonPoolByRarity(rarity: Rarity): PokemonPoolEntry[] {
  return POKEMON_POOL_BY_RARITY[rarity] || [];
}

/**
 * Obtiene un Pokémon por su ID
 */
export function getPokemonById(pokemonId: number): PokemonPoolEntry | undefined {
  return ALL_POKEMON_POOL.find(p => p.pokemonId === pokemonId);
}

/**
 * Genera la URL del sprite de un Pokémon
 */
export function getPokemonSprite(pokemonId: number, isShiny: boolean = false): string {
  const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
  return isShiny ? `${base}/shiny/${pokemonId}.png` : `${base}/${pokemonId}.png`;
}

/**
 * Genera la URL del artwork oficial de un Pokémon
 */
export function getPokemonArtwork(pokemonId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
}
