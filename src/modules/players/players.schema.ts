/**
 * Esquemas de Validación para Jugadores
 * Cobblemon Los Pitufos - Backend API
 * 
 * Define los esquemas Zod para validar datos de jugadores
 */

import { z } from 'zod';

/**
 * Esquema para stats de Pokémon (IVs/EVs)
 */
export const pokemonStatsSchema = z.object({
  hp: z.number().int().min(0).max(252),
  attack: z.number().int().min(0).max(252),
  defense: z.number().int().min(0).max(252),
  spAttack: z.number().int().min(0).max(252),
  spDefense: z.number().int().min(0).max(252),
  speed: z.number().int().min(0).max(252),
});

/**
 * Esquema para movimiento de Pokémon
 */
export const pokemonMoveSchema = z.object({
  name: z.string().min(1),
});

/**
 * Esquema para Pokémon completo
 */
export const pokemonSchema = z.object({
  uuid: z.string().uuid(),
  species: z.string().min(1),
  speciesId: z.number().int().min(1).max(1010),
  nickname: z.string().optional(),
  level: z.number().int().min(1).max(100),
  experience: z.number().int().min(0),
  shiny: z.boolean(),
  gender: z.enum(['male', 'female', 'genderless']),
  nature: z.string().min(1),
  ability: z.string().min(1),
  friendship: z.number().int().min(0).max(255),
  ball: z.string().min(1),
  ivs: pokemonStatsSchema,
  evs: pokemonStatsSchema,
  moves: z.array(pokemonMoveSchema).max(4),
  heldItem: z.string().optional(),
  heldItemCount: z.number().int().min(0).optional(),
  currentHealth: z.number().int().min(0),
  maxHealth: z.number().int().min(1),
  status: z.string().optional(),
  form: z.string().optional(),
});

/**
 * Esquema para caja de PC
 */
export const pcBoxSchema = z.object({
  boxNumber: z.number().int().min(1),
  pokemon: z.array(pokemonSchema),
});

/**
 * Esquema para sincronización de jugador desde plugin
 */
export const playerSyncSchema = z.object({
  uuid: z.string().uuid('UUID de Minecraft inválido'),
  username: z.string().min(1, 'Username es requerido'),
  online: z.boolean().optional().default(false),
  lastSeen: z.string().optional(),
  party: z.array(pokemonSchema).max(6).optional(),
  pcStorage: z.array(pcBoxSchema).max(2).optional(), // Solo primeras 2 cajas
  cobbleDollarsBalance: z.number().int().min(0).optional().default(0),
});

/**
 * Esquema para marcar starter como entregado
 */
export const starterGivenSchema = z.object({
  uuid: z.string().uuid('UUID de Minecraft inválido'),
  pokemonId: z.number().int().min(1).max(1010).optional(),
  given: z.boolean().optional().default(true),
});

/**
 * Tipos inferidos de los esquemas
 */
export type PokemonStatsInput = z.infer<typeof pokemonStatsSchema>;
export type PokemonMoveInput = z.infer<typeof pokemonMoveSchema>;
export type PokemonInput = z.infer<typeof pokemonSchema>;
export type PCBoxInput = z.infer<typeof pcBoxSchema>;
export type PlayerSyncInput = z.infer<typeof playerSyncSchema>;
export type StarterGivenInput = z.infer<typeof starterGivenSchema>;
