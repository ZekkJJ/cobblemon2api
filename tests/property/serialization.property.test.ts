/**
 * Property-Based Tests - Serialización de Pokémon
 * Cobblemon Los Pitufos - Backend API
 * 
 * **Feature: cobblemon-pitufos-rebuild, Propiedad 37: Round-Trip de Serialización de Pokémon**
 * **Valida: Requisitos 15.1, 15.3**
 * 
 * Para cualquier objeto Pokemon válido, serialize(deserialize(serialize(pokemon)))
 * debe producir un resultado idéntico a serialize(pokemon).
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  serializePokemon,
  deserializePokemon,
  verifyPokemonIntegrity,
  serializePokemonArray,
  deserializePokemonArray,
} from '../../src/shared/utils/serialization.js';
import {
  Pokemon,
  PokemonStats,
  PokemonMove,
  POKEMON_GENDERS,
  POKEMON_NATURES,
} from '../../src/shared/types/pokemon.types.js';

// ============================================
// GENERADORES (ARBITRARIES)
// ============================================

/**
 * Generador de estadísticas de Pokémon
 */
const pokemonStatsArbitrary = fc.record({
  hp: fc.integer({ min: 0, max: 31 }),
  attack: fc.integer({ min: 0, max: 31 }),
  defense: fc.integer({ min: 0, max: 31 }),
  spAttack: fc.integer({ min: 0, max: 31 }),
  spDefense: fc.integer({ min: 0, max: 31 }),
  speed: fc.integer({ min: 0, max: 31 }),
});

/**
 * Generador de EVs (pueden ser más altos que IVs)
 */
const pokemonEvsArbitrary = fc.record({
  hp: fc.integer({ min: 0, max: 252 }),
  attack: fc.integer({ min: 0, max: 252 }),
  defense: fc.integer({ min: 0, max: 252 }),
  spAttack: fc.integer({ min: 0, max: 252 }),
  spDefense: fc.integer({ min: 0, max: 252 }),
  speed: fc.integer({ min: 0, max: 252 }),
});

/**
 * Generador de movimiento de Pokémon
 */
const pokemonMoveArbitrary = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
  pp: fc.option(fc.integer({ min: 0, max: 64 }), { nil: undefined }),
  maxPp: fc.option(fc.integer({ min: 1, max: 64 }), { nil: undefined }),
});

/**
 * Lista de especies de Pokémon para testing
 */
const pokemonSpecies = [
  'bulbasaur', 'charmander', 'squirtle', 'pikachu', 'eevee',
  'chikorita', 'cyndaquil', 'totodile', 'treecko', 'torchic',
  'mudkip', 'turtwig', 'chimchar', 'piplup', 'snivy',
  'tepig', 'oshawott', 'chespin', 'fennekin', 'froakie',
  'rowlet', 'litten', 'popplio', 'grookey', 'scorbunny', 'sobble',
];

/**
 * Lista de Pokéballs para testing
 */
const pokeballTypes = [
  'poke_ball', 'great_ball', 'ultra_ball', 'master_ball',
  'premier_ball', 'luxury_ball', 'quick_ball', 'dusk_ball',
];

/**
 * Generador de Pokémon completo
 */
const pokemonArbitrary: fc.Arbitrary<Pokemon> = fc.record({
  uuid: fc.uuid(),
  species: fc.constantFrom(...pokemonSpecies),
  speciesId: fc.integer({ min: 1, max: 1010 }),
  nickname: fc.option(fc.string({ minLength: 1, maxLength: 12 }), { nil: undefined }),
  level: fc.integer({ min: 1, max: 100 }),
  experience: fc.integer({ min: 0, max: 1000000 }),
  shiny: fc.boolean(),
  gender: fc.constantFrom(...POKEMON_GENDERS),
  nature: fc.constantFrom(...POKEMON_NATURES),
  ability: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
  friendship: fc.integer({ min: 0, max: 255 }),
  ball: fc.constantFrom(...pokeballTypes),
  ivs: pokemonStatsArbitrary,
  evs: pokemonEvsArbitrary,
  moves: fc.array(pokemonMoveArbitrary, { minLength: 0, maxLength: 4 }),
  heldItem: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
  heldItemCount: fc.option(fc.integer({ min: 1, max: 99 }), { nil: undefined }),
  currentHealth: fc.integer({ min: 0, max: 999 }),
  maxHealth: fc.integer({ min: 1, max: 999 }),
  status: fc.option(fc.constantFrom('paralysis', 'burn', 'freeze', 'poison', 'sleep'), { nil: undefined }),
  form: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  originalTrainer: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  caughtAt: fc.option(fc.date().map(d => d.toISOString()), { nil: undefined }),
  caughtLocation: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
});

// ============================================
// PROPERTY TESTS
// ============================================

describe('Propiedad 37: Round-Trip de Serialización de Pokémon', () => {
  /**
   * **Feature: cobblemon-pitufos-rebuild, Propiedad 37: Round-Trip de Serialización de Pokémon**
   * **Valida: Requisitos 15.1, 15.3**
   */
  it('serialize(deserialize(serialize(pokemon))) === serialize(pokemon)', () => {
    fc.assert(
      fc.property(pokemonArbitrary, (pokemon) => {
        // Paso 1: Serializar el Pokémon original
        const serialized1 = serializePokemon(pokemon);
        
        // Paso 2: Deserializar
        const deserialized = deserializePokemon(serialized1);
        
        // Verificar que la deserialización fue exitosa
        expect(deserialized.success).toBe(true);
        expect(deserialized.data).toBeDefined();
        
        if (!deserialized.data) {
          throw new Error('Deserialización falló inesperadamente');
        }
        
        // Paso 3: Re-serializar
        const serialized2 = serializePokemon(deserialized.data);
        
        // Paso 4: Comparar
        expect(serialized2).toEqual(serialized1);
      }),
      { numRuns: 100 }
    );
  });

  it('verifyPokemonIntegrity retorna true para Pokémon válidos', () => {
    fc.assert(
      fc.property(pokemonArbitrary, (pokemon) => {
        const isValid = verifyPokemonIntegrity(pokemon);
        expect(isValid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('la serialización preserva todos los campos requeridos', () => {
    fc.assert(
      fc.property(pokemonArbitrary, (pokemon) => {
        const serialized = serializePokemon(pokemon);
        
        // Verificar campos obligatorios
        expect(serialized.uuid).toBe(pokemon.uuid);
        expect(serialized.species).toBe(pokemon.species);
        expect(serialized.speciesId).toBe(pokemon.speciesId);
        expect(serialized.level).toBe(pokemon.level);
        expect(serialized.experience).toBe(pokemon.experience);
        expect(serialized.shiny).toBe(pokemon.shiny);
        expect(serialized.gender).toBe(pokemon.gender);
        expect(serialized.nature).toBe(pokemon.nature);
        expect(serialized.ability).toBe(pokemon.ability);
        expect(serialized.friendship).toBe(pokemon.friendship);
        expect(serialized.ball).toBe(pokemon.ball);
        expect(serialized.currentHealth).toBe(pokemon.currentHealth);
        expect(serialized.maxHealth).toBe(pokemon.maxHealth);
        
        // Verificar estadísticas
        expect(serialized.ivs).toEqual(pokemon.ivs);
        expect(serialized.evs).toEqual(pokemon.evs);
        
        // Verificar movimientos
        expect(serialized.moves).toHaveLength(pokemon.moves.length);
      }),
      { numRuns: 100 }
    );
  });

  it('la serialización de arrays preserva el orden y contenido', () => {
    fc.assert(
      fc.property(
        fc.array(pokemonArbitrary, { minLength: 1, maxLength: 6 }),
        (pokemonArray) => {
          const serialized = serializePokemonArray(pokemonArray);
          const deserialized = deserializePokemonArray(serialized);
          
          expect(deserialized.success).toBe(true);
          expect(deserialized.data).toHaveLength(pokemonArray.length);
          
          if (deserialized.data) {
            for (let i = 0; i < pokemonArray.length; i++) {
              expect(deserialized.data[i]?.uuid).toBe(pokemonArray[i]?.uuid);
              expect(deserialized.data[i]?.species).toBe(pokemonArray[i]?.species);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('las estadísticas se mantienen dentro de rangos válidos después del round-trip', () => {
    fc.assert(
      fc.property(pokemonArbitrary, (pokemon) => {
        const serialized = serializePokemon(pokemon);
        const deserialized = deserializePokemon(serialized);
        
        expect(deserialized.success).toBe(true);
        
        if (deserialized.data) {
          const { ivs, evs } = deserialized.data;
          
          // IVs deben estar entre 0 y 31
          expect(ivs.hp).toBeGreaterThanOrEqual(0);
          expect(ivs.hp).toBeLessThanOrEqual(31);
          expect(ivs.attack).toBeGreaterThanOrEqual(0);
          expect(ivs.attack).toBeLessThanOrEqual(31);
          
          // EVs deben estar entre 0 y 255
          expect(evs.hp).toBeGreaterThanOrEqual(0);
          expect(evs.hp).toBeLessThanOrEqual(255);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('los movimientos se preservan correctamente en el round-trip', () => {
    fc.assert(
      fc.property(pokemonArbitrary, (pokemon) => {
        const serialized = serializePokemon(pokemon);
        const deserialized = deserializePokemon(serialized);
        
        expect(deserialized.success).toBe(true);
        
        if (deserialized.data) {
          expect(deserialized.data.moves).toHaveLength(pokemon.moves.length);
          
          for (let i = 0; i < pokemon.moves.length; i++) {
            expect(deserialized.data.moves[i]?.name).toBe(pokemon.moves[i]?.name);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('los campos opcionales se preservan cuando están presentes', () => {
    fc.assert(
      fc.property(pokemonArbitrary, (pokemon) => {
        const serialized = serializePokemon(pokemon);
        const deserialized = deserializePokemon(serialized);
        
        expect(deserialized.success).toBe(true);
        
        if (deserialized.data) {
          // Campos opcionales
          expect(deserialized.data.nickname).toBe(pokemon.nickname);
          expect(deserialized.data.heldItem).toBe(pokemon.heldItem);
          expect(deserialized.data.status).toBe(pokemon.status);
          expect(deserialized.data.form).toBe(pokemon.form);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('la serialización produce JSON válido', () => {
    fc.assert(
      fc.property(pokemonArbitrary, (pokemon) => {
        const serialized = serializePokemon(pokemon);
        
        // Debe poder convertirse a JSON y parsearse de vuelta
        const jsonString = JSON.stringify(serialized);
        const parsed = JSON.parse(jsonString);
        
        expect(parsed).toEqual(serialized);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Propiedad 38: Validación de Deserialización', () => {
  /**
   * **Feature: cobblemon-pitufos-rebuild, Propiedad 38: Validación de Deserialización**
   * **Valida: Requisitos 15.2**
   */
  it('la deserialización rechaza datos con campos faltantes', () => {
    const invalidData = [
      {}, // Vacío
      { uuid: 'test' }, // Solo UUID
      { species: 'pikachu' }, // Solo species
      { uuid: 'test', species: 'pikachu' }, // Faltan muchos campos
    ];
    
    for (const data of invalidData) {
      const result = deserializePokemon(data);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }
  });

  it('la deserialización rechaza tipos de datos incorrectos', () => {
    fc.assert(
      fc.property(pokemonArbitrary, (validPokemon) => {
        // Crear versión con tipo incorrecto
        const invalidData = {
          ...serializePokemon(validPokemon),
          level: 'not a number', // Tipo incorrecto
        };
        
        const result = deserializePokemon(invalidData);
        expect(result.success).toBe(false);
      }),
      { numRuns: 50 }
    );
  });

  it('la deserialización rechaza valores fuera de rango', () => {
    fc.assert(
      fc.property(pokemonArbitrary, (validPokemon) => {
        // Crear versión con nivel fuera de rango
        const invalidData = {
          ...serializePokemon(validPokemon),
          level: 999, // Fuera de rango (max 100)
        };
        
        const result = deserializePokemon(invalidData);
        expect(result.success).toBe(false);
      }),
      { numRuns: 50 }
    );
  });
});
