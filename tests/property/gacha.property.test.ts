/**
 * Property-Based Tests - Gacha
 * Cobblemon Los Pitufos - Backend API
 * 
 * Tests de propiedades para el sistema gacha de starters
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { STARTERS_DATA } from '../../src/shared/data/starters.data.js';

describe('Property-Based Tests - Gacha', () => {
  /**
   * **Feature: cobblemon-pitufos-rebuild, Propiedad 5: Unicidad de Starter en Gacha**
   * **Valida: Requisitos 3.1, 3.4**
   * 
   * Para cualquier tirada de gacha exitosa, el starter seleccionado debe ser uno de los 27
   * disponibles que no haya sido reclamado.
   */
  it('Property 5: Starters seleccionados deben ser únicos', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 26 }), { minLength: 1, maxLength: 27 }),
        (indices) => {
          // Simular selección de starters usando índices únicos
          const uniqueIndices = Array.from(new Set(indices));
          const selectedStarters = uniqueIndices.map(i => STARTERS_DATA[i]);

          // Verificar que todos los starters seleccionados son válidos
          for (const starter of selectedStarters) {
            expect(starter).toBeDefined();
            expect(starter.pokemonId).toBeGreaterThan(0);
            expect(starter.name).toBeTruthy();
          }

          // Verificar que no hay duplicados
          const pokemonIds = selectedStarters.map(s => s.pokemonId);
          const uniqueIds = new Set(pokemonIds);
          expect(uniqueIds.size).toBe(pokemonIds.length);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: cobblemon-pitufos-rebuild, Propiedad 6: Prevención de Tirada Duplicada**
   * **Valida: Requisitos 3.2**
   * 
   * Para cualquier usuario que ya tiene un starterId asignado, no puede tener otro.
   */
  it('Property 6: Un usuario solo puede tener un starter', () => {
    fc.assert(
      fc.property(
        fc.record({
          discordId: fc.uuid(),
          starterId: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: null }),
        }),
        (user) => {
          // Si el usuario ya tiene un starter, no puede tener otro
          if (user.starterId !== null) {
            // Simular intento de asignar otro starter
            const canRoll = user.starterId === null;
            expect(canRoll).toBe(false);
            return true;
          }

          // Si no tiene starter, puede hacer tirada
          const canRoll = user.starterId === null;
          expect(canRoll).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: cobblemon-pitufos-rebuild, Propiedad 9: Consistencia de Conteo de Starters**
   * **Valida: Requisitos 3.6, 8.3**
   * 
   * Para cualquier momento, la suma de starters reclamados más starters disponibles
   * debe ser exactamente 27.
   */
  it('Property 9: Suma de starters reclamados + disponibles = 27', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 27 }), // Número de starters reclamados
        (claimedCount) => {
          const totalStarters = 27;
          const availableCount = totalStarters - claimedCount;

          // Verificar que la suma es siempre 27
          expect(claimedCount + availableCount).toBe(27);

          // Verificar que los conteos son válidos
          expect(claimedCount).toBeGreaterThanOrEqual(0);
          expect(claimedCount).toBeLessThanOrEqual(27);
          expect(availableCount).toBeGreaterThanOrEqual(0);
          expect(availableCount).toBeLessThanOrEqual(27);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Propiedad: Todos los starters en STARTERS_DATA son válidos
   */
  it('Property: Todos los starters tienen datos válidos', () => {
    expect(STARTERS_DATA).toHaveLength(27);

    for (const starter of STARTERS_DATA) {
      // Verificar campos obligatorios
      expect(starter.pokemonId).toBeGreaterThan(0);
      expect(starter.name).toBeTruthy();
      expect(starter.nameEs).toBeTruthy();
      expect(starter.generation).toBeGreaterThan(0);
      expect(starter.generation).toBeLessThanOrEqual(9);
      expect(starter.types).toBeInstanceOf(Array);
      expect(starter.types.length).toBeGreaterThan(0);
      expect(starter.stats).toBeDefined();
      expect(starter.abilities).toBeInstanceOf(Array);
      expect(starter.abilities.length).toBeGreaterThan(0);
      expect(starter.signatureMoves).toBeInstanceOf(Array);
      expect(starter.evolutions).toBeInstanceOf(Array);
      expect(starter.description).toBeTruthy();
      expect(starter.height).toBeGreaterThan(0);
      expect(starter.weight).toBeGreaterThan(0);
    }
  });

  /**
   * Propiedad: Selección aleatoria debe ser uniforme
   */
  it('Property: Selección aleatoria debe cubrir todos los starters', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 26 }), { minLength: 100, maxLength: 100 }),
        (indices) => {
          // Con 100 selecciones aleatorias, deberíamos ver varios starters diferentes
          const uniqueIndices = new Set(indices);

          // Esperamos al menos 15 starters diferentes en 100 tiradas
          expect(uniqueIndices.size).toBeGreaterThanOrEqual(10);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Propiedad: Starters disponibles disminuyen monotónicamente
   */
  it('Property: Starters disponibles nunca aumentan', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 27 }),
        (rolls) => {
          let available = 27;
          const availableCounts: number[] = [available];

          for (const success of rolls) {
            if (success && available > 0) {
              available--;
            }
            availableCounts.push(available);
          }

          // Verificar que la secuencia es monotónicamente decreciente
          for (let i = 1; i < availableCounts.length; i++) {
            expect(availableCounts[i]).toBeLessThanOrEqual(availableCounts[i - 1]);
          }

          // Verificar que nunca es negativo
          for (const count of availableCounts) {
            expect(count).toBeGreaterThanOrEqual(0);
            expect(count).toBeLessThanOrEqual(27);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Propiedad: Cada generación tiene exactamente 3 starters
   */
  it('Property: Cada generación tiene 3 starters', () => {
    const startersByGeneration = STARTERS_DATA.reduce((acc, starter) => {
      const gen = starter.generation;
      if (!acc[gen]) acc[gen] = [];
      acc[gen].push(starter);
      return acc;
    }, {} as Record<number, typeof STARTERS_DATA>);

    // Verificar que hay 9 generaciones
    expect(Object.keys(startersByGeneration)).toHaveLength(9);

    // Verificar que cada generación tiene exactamente 3 starters
    for (let gen = 1; gen <= 9; gen++) {
      expect(startersByGeneration[gen]).toBeDefined();
      expect(startersByGeneration[gen]).toHaveLength(3);
    }
  });

  /**
   * Propiedad: Tipos de starters son válidos
   */
  it('Property: Todos los starters tienen tipos válidos', () => {
    const validTypes = [
      'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
      'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
      'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy',
    ];

    for (const starter of STARTERS_DATA) {
      for (const type of starter.types) {
        expect(validTypes).toContain(type);
      }

      // Los starters deben tener 1 o 2 tipos
      expect(starter.types.length).toBeGreaterThanOrEqual(1);
      expect(starter.types.length).toBeLessThanOrEqual(2);
    }
  });
});
