/**
 * Funciones de Serialización/Deserialización
 * Cobblemon Los Pitufos - Backend API
 * 
 * Este módulo proporciona funciones para serializar y deserializar
 * datos de Pokémon y otros objetos del sistema, garantizando
 * integridad mediante validación con Zod.
 */

import { z } from 'zod';
import {
  Pokemon,
  PokemonStats,
  PokemonMove,
  PokemonSchema,
  PokemonStatsSchema,
  PokemonMoveSchema,
  PCBox,
  PCBoxSchema,
  createEmptyStats,
} from '../types/pokemon.types.js';

// ============================================
// TIPOS DE SERIALIZACIÓN
// ============================================

/**
 * Pokémon serializado (JSON-safe)
 */
export interface SerializedPokemon {
  uuid: string;
  species: string;
  speciesId: number;
  nickname?: string;
  level: number;
  experience: number;
  shiny: boolean;
  gender: string;
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
  originalTrainer?: string;
  caughtAt?: string;
  caughtLocation?: string;
}

/**
 * Resultado de deserialización
 */
export interface DeserializationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  field?: string;
}

// ============================================
// SERIALIZACIÓN DE POKÉMON
// ============================================

/**
 * Serializa un Pokémon a formato JSON-safe
 * Garantiza que todos los campos estén presentes y sean válidos
 */
export function serializePokemon(pokemon: Pokemon): SerializedPokemon {
  return {
    uuid: pokemon.uuid,
    species: pokemon.species,
    speciesId: pokemon.speciesId,
    nickname: pokemon.nickname,
    level: pokemon.level,
    experience: pokemon.experience,
    shiny: pokemon.shiny,
    gender: pokemon.gender,
    nature: pokemon.nature,
    ability: pokemon.ability,
    friendship: pokemon.friendship,
    ball: pokemon.ball,
    ivs: { ...pokemon.ivs },
    evs: { ...pokemon.evs },
    moves: pokemon.moves.map(m => ({ ...m })),
    heldItem: pokemon.heldItem,
    heldItemCount: pokemon.heldItemCount,
    currentHealth: pokemon.currentHealth,
    maxHealth: pokemon.maxHealth,
    status: pokemon.status,
    form: pokemon.form,
    originalTrainer: pokemon.originalTrainer,
    caughtAt: pokemon.caughtAt,
    caughtLocation: pokemon.caughtLocation,
  };
}

/**
 * Deserializa datos JSON a un objeto Pokemon validado
 * Retorna un resultado con éxito/error y datos o mensaje de error
 */
export function deserializePokemon(data: unknown): DeserializationResult<Pokemon> {
  const result = PokemonSchema.safeParse(data);
  
  if (!result.success) {
    const firstError = result.error.errors[0];
    return {
      success: false,
      error: firstError?.message || 'Error de validación',
      field: firstError?.path.join('.'),
    };
  }
  
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Deserializa un Pokémon con valores por defecto para campos faltantes
 * Útil para datos parciales del plugin de Minecraft
 */
export function deserializePokemonWithDefaults(data: unknown): DeserializationResult<Pokemon> {
  if (!data || typeof data !== 'object') {
    return {
      success: false,
      error: 'Datos de Pokémon inválidos',
    };
  }
  
  const input = data as Record<string, unknown>;
  
  // Aplicar valores por defecto
  const withDefaults = {
    uuid: input['uuid'] || crypto.randomUUID(),
    species: input['species'] || 'unknown',
    speciesId: input['speciesId'] || 0,
    nickname: input['nickname'],
    level: input['level'] || 1,
    experience: input['experience'] || 0,
    shiny: input['shiny'] || false,
    gender: input['gender'] || 'genderless',
    nature: input['nature'] || 'hardy',
    ability: input['ability'] || 'unknown',
    friendship: input['friendship'] || 0,
    ball: input['ball'] || 'poke_ball',
    ivs: normalizeStats(input['ivs']),
    evs: normalizeStats(input['evs']),
    moves: normalizeMoves(input['moves']),
    heldItem: input['heldItem'],
    heldItemCount: input['heldItemCount'],
    currentHealth: input['currentHealth'] || input['maxHealth'] || 1,
    maxHealth: input['maxHealth'] || 1,
    status: input['status'],
    form: input['form'],
    originalTrainer: input['originalTrainer'],
    caughtAt: input['caughtAt'],
    caughtLocation: input['caughtLocation'],
  };
  
  return deserializePokemon(withDefaults);
}

/**
 * Serializa un array de Pokémon
 */
export function serializePokemonArray(pokemon: Pokemon[]): SerializedPokemon[] {
  return pokemon.map(serializePokemon);
}

/**
 * Deserializa un array de Pokémon
 */
export function deserializePokemonArray(data: unknown[]): DeserializationResult<Pokemon[]> {
  const results: Pokemon[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const result = deserializePokemonWithDefaults(data[i]);
    if (!result.success) {
      return {
        success: false,
        error: `Error en Pokémon ${i}: ${result.error}`,
        field: `[${i}].${result.field || ''}`,
      };
    }
    if (result.data) {
      results.push(result.data);
    }
  }
  
  return {
    success: true,
    data: results,
  };
}

// ============================================
// SERIALIZACIÓN DE PC BOX
// ============================================

/**
 * Serializa una caja de PC
 */
export function serializePCBox(box: PCBox): PCBox {
  return {
    boxNumber: box.boxNumber,
    name: box.name,
    pokemon: box.pokemon.map(p => p ? serializePokemon(p) : null) as (Pokemon | null)[],
  };
}

/**
 * Deserializa una caja de PC
 */
export function deserializePCBox(data: unknown): DeserializationResult<PCBox> {
  if (!data || typeof data !== 'object') {
    return {
      success: false,
      error: 'Datos de caja inválidos',
    };
  }
  
  const input = data as Record<string, unknown>;
  
  // Deserializar Pokémon de la caja
  const pokemonArray = Array.isArray(input['pokemon']) ? input['pokemon'] : [];
  const deserializedPokemon: (Pokemon | null)[] = [];
  
  for (let i = 0; i < pokemonArray.length; i++) {
    const slot = pokemonArray[i];
    if (slot === null || slot === undefined) {
      deserializedPokemon.push(null);
    } else {
      const result = deserializePokemonWithDefaults(slot);
      if (!result.success) {
        return {
          success: false,
          error: `Error en slot ${i}: ${result.error}`,
          field: `pokemon[${i}].${result.field || ''}`,
        };
      }
      deserializedPokemon.push(result.data || null);
    }
  }
  
  return {
    success: true,
    data: {
      boxNumber: typeof input['boxNumber'] === 'number' ? input['boxNumber'] : 0,
      name: typeof input['name'] === 'string' ? input['name'] : undefined,
      pokemon: deserializedPokemon,
    },
  };
}

// ============================================
// FUNCIONES DE NORMALIZACIÓN
// ============================================

/**
 * Normaliza estadísticas de Pokémon
 */
function normalizeStats(stats: unknown): PokemonStats {
  if (!stats || typeof stats !== 'object') {
    return createEmptyStats();
  }
  
  const input = stats as Record<string, unknown>;
  
  return {
    hp: normalizeStatValue(input['hp']),
    attack: normalizeStatValue(input['attack'] || input['atk']),
    defense: normalizeStatValue(input['defense'] || input['def']),
    spAttack: normalizeStatValue(input['spAttack'] || input['spa'] || input['specialAttack']),
    spDefense: normalizeStatValue(input['spDefense'] || input['spd'] || input['specialDefense']),
    speed: normalizeStatValue(input['speed'] || input['spe']),
  };
}

/**
 * Normaliza un valor de estadística individual
 */
function normalizeStatValue(value: unknown): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return Math.max(0, Math.min(255, Math.floor(value)));
  }
  return 0;
}

/**
 * Normaliza array de movimientos
 */
function normalizeMoves(moves: unknown): PokemonMove[] {
  if (!Array.isArray(moves)) {
    return [];
  }
  
  return moves
    .slice(0, 4)
    .map(move => {
      if (typeof move === 'string') {
        return { name: move };
      }
      if (move && typeof move === 'object') {
        const m = move as Record<string, unknown>;
        return {
          name: typeof m['name'] === 'string' ? m['name'] : 'unknown',
          pp: typeof m['pp'] === 'number' ? m['pp'] : undefined,
          maxPp: typeof m['maxPp'] === 'number' ? m['maxPp'] : undefined,
        };
      }
      return { name: 'unknown' };
    })
    .filter(m => m.name !== 'unknown');
}

// ============================================
// VALIDACIÓN Y VERIFICACIÓN
// ============================================

/**
 * Verifica la integridad de un Pokémon mediante round-trip
 * serialize(deserialize(serialize(pokemon))) === serialize(pokemon)
 */
export function verifyPokemonIntegrity(pokemon: Pokemon): boolean {
  try {
    const serialized = serializePokemon(pokemon);
    const deserialized = deserializePokemon(serialized);
    
    if (!deserialized.success || !deserialized.data) {
      return false;
    }
    
    const reserialized = serializePokemon(deserialized.data);
    
    return JSON.stringify(serialized) === JSON.stringify(reserialized);
  } catch {
    return false;
  }
}

/**
 * Valida datos de sincronización del plugin
 */
export function validateSyncData(data: unknown): DeserializationResult<{
  party: Pokemon[];
  pcStorage: PCBox[];
}> {
  if (!data || typeof data !== 'object') {
    return {
      success: false,
      error: 'Datos de sincronización inválidos',
    };
  }
  
  const input = data as Record<string, unknown>;
  
  // Validar party
  const partyData = Array.isArray(input['party']) ? input['party'] : [];
  const partyResult = deserializePokemonArray(partyData.slice(0, 6));
  
  if (!partyResult.success) {
    return {
      success: false,
      error: `Error en party: ${partyResult.error}`,
      field: `party.${partyResult.field || ''}`,
    };
  }
  
  // Validar PC storage
  const pcData = Array.isArray(input['pcStorage']) ? input['pcStorage'] : [];
  const pcBoxes: PCBox[] = [];
  
  for (let i = 0; i < Math.min(pcData.length, 50); i++) {
    const boxResult = deserializePCBox(pcData[i]);
    if (!boxResult.success) {
      return {
        success: false,
        error: `Error en PC box ${i}: ${boxResult.error}`,
        field: `pcStorage[${i}].${boxResult.field || ''}`,
      };
    }
    if (boxResult.data) {
      pcBoxes.push(boxResult.data);
    }
  }
  
  return {
    success: true,
    data: {
      party: partyResult.data || [],
      pcStorage: pcBoxes,
    },
  };
}

/**
 * Convierte datos del plugin de Minecraft al formato interno
 * Maneja diferencias de nomenclatura entre sistemas
 */
export function convertFromMinecraftFormat(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const input = data as Record<string, unknown>;
  
  // Mapeo de campos del plugin a formato interno
  const fieldMappings: Record<string, string> = {
    'uuid': 'uuid',
    'species': 'species',
    'speciesId': 'speciesId',
    'pokemon_id': 'speciesId',
    'nickname': 'nickname',
    'level': 'level',
    'exp': 'experience',
    'experience': 'experience',
    'isShiny': 'shiny',
    'shiny': 'shiny',
    'gender': 'gender',
    'nature': 'nature',
    'ability': 'ability',
    'friendship': 'friendship',
    'pokeball': 'ball',
    'ball': 'ball',
    'ivs': 'ivs',
    'evs': 'evs',
    'moves': 'moves',
    'heldItem': 'heldItem',
    'held_item': 'heldItem',
    'currentHp': 'currentHealth',
    'currentHealth': 'currentHealth',
    'maxHp': 'maxHealth',
    'maxHealth': 'maxHealth',
    'status': 'status',
    'form': 'form',
  };
  
  const converted: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(input)) {
    const mappedKey = fieldMappings[key] || key;
    converted[mappedKey] = value;
  }
  
  return converted;
}
