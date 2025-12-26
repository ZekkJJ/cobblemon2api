/**
 * Crypto RNG Service
 * Cobblemon Los Pitufos - Backend API
 * 
 * Servicio de generación de números aleatorios criptográficamente seguros
 * usando crypto.randomBytes() en lugar de Math.random()
 */

import crypto from 'crypto';

export class CryptoRngService {
  /**
   * Genera un número aleatorio entre 0 (inclusive) y 1 (exclusive)
   * usando crypto.randomBytes() para verdadera aleatoriedad
   */
  random(): number {
    // Usar 6 bytes (48 bits) para máxima precisión dentro de float64
    const bytes = crypto.randomBytes(6);
    // Convertir a número entre 0 y 1
    const value = bytes.readUIntBE(0, 6) / (Math.pow(2, 48) - 1);
    
    // Validar bounds
    if (value < 0 || value >= 1) {
      throw new Error(`RNG value out of bounds: ${value}`);
    }
    
    return value;
  }

  /**
   * Genera un entero aleatorio en el rango [min, max] (ambos inclusive)
   */
  randomInt(min: number, max: number): number {
    if (min > max) {
      throw new Error(`Invalid range: min (${min}) > max (${max})`);
    }
    
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      throw new Error('min and max must be integers');
    }
    
    const range = max - min + 1;
    
    // Para rangos pequeños, usar método simple
    if (range <= 256) {
      const byte = crypto.randomBytes(1)[0];
      const result = min + (byte! % range);
      
      // Validar bounds
      if (result < min || result > max) {
        throw new Error(`RNG int out of bounds: ${result} not in [${min}, ${max}]`);
      }
      
      return result;
    }
    
    // Para rangos más grandes, usar más bytes
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const maxValid = Math.floor(Math.pow(256, bytesNeeded) / range) * range;
    
    let value: number;
    do {
      const bytes = crypto.randomBytes(bytesNeeded);
      value = bytes.readUIntBE(0, bytesNeeded);
    } while (value >= maxValid);
    
    const result = min + (value % range);
    
    // Validar bounds
    if (result < min || result > max) {
      throw new Error(`RNG int out of bounds: ${result} not in [${min}, ${max}]`);
    }
    
    return result;
  }

  /**
   * Selecciona un elemento de un array usando pesos
   * @param items Array de elementos a seleccionar
   * @param weights Array de pesos correspondientes (deben sumar > 0)
   * @returns El elemento seleccionado
   */
  weightedSelect<T>(items: T[], weights: number[]): T {
    if (items.length === 0) {
      throw new Error('Items array cannot be empty');
    }
    
    if (items.length !== weights.length) {
      throw new Error('Items and weights arrays must have the same length');
    }
    
    // Validar que todos los pesos sean no negativos
    for (const weight of weights) {
      if (weight < 0) {
        throw new Error('Weights cannot be negative');
      }
    }
    
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    if (totalWeight <= 0) {
      throw new Error('Total weight must be greater than 0');
    }
    
    // Generar número aleatorio entre 0 y totalWeight
    const random = this.random() * totalWeight;
    
    let cumulativeWeight = 0;
    for (let i = 0; i < items.length; i++) {
      cumulativeWeight += weights[i]!;
      if (random < cumulativeWeight) {
        return items[i]!;
      }
    }
    
    // Fallback al último elemento (por errores de punto flotante)
    return items[items.length - 1]!;
  }

  /**
   * Genera un UUID v4 criptográficamente seguro
   */
  generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Genera una clave de idempotencia única
   */
  generateIdempotencyKey(): string {
    return `${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Determina si un evento ocurre basado en probabilidad
   * @param probability Probabilidad entre 0 y 1
   */
  chance(probability: number): boolean {
    if (probability < 0 || probability > 1) {
      throw new Error(`Probability must be between 0 and 1, got: ${probability}`);
    }
    
    return this.random() < probability;
  }

  /**
   * Baraja un array de forma aleatoria (Fisher-Yates shuffle)
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i);
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
    
    return result;
  }

  /**
   * Selecciona N elementos únicos de un array
   */
  sample<T>(array: T[], count: number): T[] {
    if (count > array.length) {
      throw new Error(`Cannot sample ${count} items from array of length ${array.length}`);
    }
    
    if (count <= 0) {
      return [];
    }
    
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, count);
  }
}

// Singleton instance
export const cryptoRng = new CryptoRngService();
