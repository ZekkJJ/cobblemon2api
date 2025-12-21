/**
 * Tipos de Pokémon
 * Cobblemon Los Pitufos - Backend API
 * 
 * Define las interfaces y tipos relacionados con Pokémon.
 */

import { z } from 'zod';

// ============================================
// INTERFACES PRINCIPALES
// ============================================

/**
 * Estadísticas de un Pokémon (IVs o EVs)
 */
export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

/**
 * Movimiento de un Pokémon
 */
export interface PokemonMove {
  name: string;
  pp?: number;
  maxPp?: number;
}

/**
 * Pokémon completo
 */
export interface Pokemon {
  uuid: string;
  species: string;
  speciesId: number;
  nickname?: string;
  level: number;
  experience: number;
  shiny: boolean;
  gender: 'male' | 'female' | 'genderless';
  nature: string;
  ability: string;
  friendship: number;
  ball: string;
  
  ivs: PokemonStats;
  evs: PokemonStats;
  moves: PokemonMove[];
  
  heldItem?: string;
  heldItemCount?: number;
  currentHealth: number;
  maxHealth: number;
  status?: string;
  form?: string;
  
  // Metadatos opcionales
  originalTrainer?: string;
  caughtAt?: string;
  caughtLocation?: string;
}

/**
 * Caja de PC (almacenamiento)
 */
export interface PCBox {
  boxNumber: number;
  name?: string;
  pokemon: (Pokemon | null)[];
}

/**
 * Estadísticas base de un Pokémon (para starters)
 */
export interface StarterStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

/**
 * Habilidad de un Pokémon
 */
export interface Ability {
  name: string;
  nameEs: string;
  isHidden: boolean;
  description: string;
}

/**
 * Movimiento característico (para starters)
 */
export interface SignatureMove {
  name: string;
  type: string;
  category: 'physical' | 'special' | 'status';
  power: number | null;
  accuracy: number | null;
}

/**
 * Evolución de un Pokémon
 */
export interface Evolution {
  to: number;
  toName: string;
  method: string;
}

/**
 * Starter (Pokémon inicial del gacha)
 */
export interface Starter {
  _id?: string;
  pokemonId: number;
  name: string;
  nameEs: string;
  generation: number;
  types: string[];
  stats: StarterStats;
  abilities: Ability[];
  signatureMoves: SignatureMove[];
  evolutions: Evolution[];
  description: string;
  height: number;
  weight: number;
  isClaimed: boolean;
  claimedBy: string | null;
  claimedByNickname?: string;
  minecraftUsername?: string;
  claimedAt: string | null;
  starterIsShiny?: boolean;
}

/**
 * Sprites de un Pokémon
 */
export interface PokemonSprites {
  sprite: string;
  spriteAnimated: string;
  shiny: string;
  shinyAnimated: string;
  artwork: string;
  cry: string;
}

/**
 * Starter con sprites incluidos
 */
export interface StarterWithSprites extends Starter {
  isShiny: boolean;
  sprites: PokemonSprites;
}

// ============================================
// CONSTANTES
// ============================================

/**
 * Géneros válidos de Pokémon
 */
export const POKEMON_GENDERS = ['male', 'female', 'genderless'] as const;
export type PokemonGender = typeof POKEMON_GENDERS[number];

/**
 * Naturalezas de Pokémon
 */
export const POKEMON_NATURES = [
  'hardy', 'lonely', 'brave', 'adamant', 'naughty',
  'bold', 'docile', 'relaxed', 'impish', 'lax',
  'timid', 'hasty', 'serious', 'jolly', 'naive',
  'modest', 'mild', 'quiet', 'bashful', 'rash',
  'calm', 'gentle', 'sassy', 'careful', 'quirky',
] as const;
export type PokemonNature = typeof POKEMON_NATURES[number];

/**
 * Tipos de Pokémon
 */
export const POKEMON_TYPES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
  'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy',
] as const;
export type PokemonType = typeof POKEMON_TYPES[number];

/**
 * Tipos de Pokéballs
 */
export const POKEBALL_TYPES = [
  'poke_ball', 'great_ball', 'ultra_ball', 'master_ball',
  'premier_ball', 'luxury_ball', 'quick_ball', 'dusk_ball',
  'timer_ball', 'net_ball', 'repeat_ball', 'dive_ball',
  'heal_ball', 'nest_ball', 'safari_ball', 'dream_ball',
  'beast_ball', 'cherish_ball',
] as const;
export type PokeballType = typeof POKEBALL_TYPES[number];

// ============================================
// ESQUEMAS DE VALIDACIÓN ZOD
// ============================================

/**
 * Esquema para estadísticas de Pokémon
 */
export const PokemonStatsSchema = z.object({
  hp: z.number().min(0).max(255),
  attack: z.number().min(0).max(255),
  defense: z.number().min(0).max(255),
  spAttack: z.number().min(0).max(255),
  spDefense: z.number().min(0).max(255),
  speed: z.number().min(0).max(255),
});

/**
 * Esquema para movimiento de Pokémon
 */
export const PokemonMoveSchema = z.object({
  name: z.string().min(1),
  pp: z.number().min(0).optional(),
  maxPp: z.number().min(0).optional(),
});

/**
 * Esquema para Pokémon completo
 */
export const PokemonSchema = z.object({
  uuid: z.string().min(1),
  species: z.string().min(1),
  speciesId: z.number().min(1).max(2000),
  nickname: z.string().optional(),
  level: z.number().min(1).max(100),
  experience: z.number().min(0),
  shiny: z.boolean(),
  gender: z.enum(POKEMON_GENDERS),
  nature: z.string().min(1),
  ability: z.string().min(1),
  friendship: z.number().min(0).max(255),
  ball: z.string().min(1),
  ivs: PokemonStatsSchema,
  evs: PokemonStatsSchema,
  moves: z.array(PokemonMoveSchema).max(4),
  heldItem: z.string().optional(),
  heldItemCount: z.number().min(0).optional(),
  currentHealth: z.number().min(0),
  maxHealth: z.number().min(1),
  status: z.string().optional(),
  form: z.string().optional(),
  originalTrainer: z.string().optional(),
  caughtAt: z.string().optional(),
  caughtLocation: z.string().optional(),
});

/**
 * Esquema para caja de PC
 */
export const PCBoxSchema = z.object({
  boxNumber: z.number().min(0),
  name: z.string().optional(),
  pokemon: z.array(PokemonSchema.nullable()),
});

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Genera las URLs de sprites para un Pokémon
 */
export function getSprites(pokemonId: number, isShiny: boolean = false): PokemonSprites {
  const hasAnimated = pokemonId <= 649;
  const baseUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
  
  return {
    sprite: `${baseUrl}/${pokemonId}.png`,
    spriteAnimated: hasAnimated
      ? `${baseUrl}/versions/generation-v/black-white/animated/${pokemonId}.gif`
      : `${baseUrl}/other/showdown/${pokemonId}.gif`,
    shiny: `${baseUrl}/shiny/${pokemonId}.png`,
    shinyAnimated: hasAnimated
      ? `${baseUrl}/versions/generation-v/black-white/animated/shiny/${pokemonId}.gif`
      : `${baseUrl}/other/showdown/shiny/${pokemonId}.gif`,
    artwork: `${baseUrl}/other/official-artwork/${pokemonId}.png`,
    cry: `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${pokemonId}.ogg`,
  };
}

/**
 * Obtiene los sprites correctos según si es shiny o no
 */
export function getStarterSprites(pokemonId: number, isShiny: boolean): PokemonSprites {
  const sprites = getSprites(pokemonId);
  
  if (isShiny) {
    return {
      ...sprites,
      sprite: sprites.shiny,
      spriteAnimated: sprites.shinyAnimated,
    };
  }
  
  return sprites;
}

/**
 * Crea estadísticas vacías
 */
export function createEmptyStats(): PokemonStats {
  return {
    hp: 0,
    attack: 0,
    defense: 0,
    spAttack: 0,
    spDefense: 0,
    speed: 0,
  };
}

/**
 * Calcula el total de estadísticas
 */
export function calculateStatTotal(stats: PokemonStats): number {
  return stats.hp + stats.attack + stats.defense + 
         stats.spAttack + stats.spDefense + stats.speed;
}

/**
 * Valida si un objeto es un Pokémon válido
 */
export function isValidPokemon(obj: unknown): obj is Pokemon {
  const result = PokemonSchema.safeParse(obj);
  return result.success;
}
