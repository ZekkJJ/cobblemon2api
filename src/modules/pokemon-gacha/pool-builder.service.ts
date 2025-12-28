/**
 * Pool Builder Service
 * Cobblemon Los Pitufos - Backend API
 * 
 * Construye y gestiona el pool de recompensas del gacha
 * incluyendo rate-ups y sistema 50/50
 */

import { CryptoRngService, cryptoRng } from './crypto-rng.service.js';
import {
  GachaBanner,
  PokemonPoolEntry,
  ItemPoolEntry,
  Rarity,
  BASE_PROBABILITIES,
  PITY_CONFIG,
  FeaturedItem,
} from '../../shared/types/pokemon-gacha.types.js';
import { POKEMON_POOL_BY_RARITY } from '../../shared/data/gacha-pokemon-helpers.js';
import { ITEMS_POOL_BY_RARITY } from '../../shared/data/gacha-items-pool.data.js';

/**
 * Entrada del pool con probabilidad calculada
 */
export interface PoolEntry {
  type: 'pokemon' | 'item';
  rarity: Rarity;
  data: PokemonPoolEntry | ItemPoolEntry;
  weight: number;
  isFeatured: boolean;
}

/**
 * Pool de recompensas construido
 */
export interface RewardPool {
  entries: PoolEntry[];
  totalWeight: number;
  rarityWeights: Record<Rarity, number>;
}

/**
 * Resultado de selección de recompensa
 */
export interface SelectedReward {
  type: 'pokemon' | 'item';
  rarity: Rarity;
  data: PokemonPoolEntry | ItemPoolEntry;
  isFeatured: boolean;
}

export class PoolBuilderService {
  constructor(private rng: CryptoRngService = cryptoRng) {}

  /**
   * Construye el pool completo de recompensas para un banner
   */
  buildPool(banner: GachaBanner): RewardPool {
    const entries: PoolEntry[] = [];
    const rarityWeights: Record<Rarity, number> = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
      mythic: 0,
    };

    // Usar pool del banner si existe, sino usar pool por defecto
    const pokemonPool = banner.pokemonPool?.length > 0 
      ? this.groupByRarity(banner.pokemonPool)
      : POKEMON_POOL_BY_RARITY;
    
    const itemPool = banner.itemPool?.length > 0
      ? this.groupItemsByRarity(banner.itemPool)
      : ITEMS_POOL_BY_RARITY;

    // Crear set de IDs destacados para búsqueda rápida
    const featuredPokemonIds = new Set(
      banner.featuredPokemon?.filter(f => f.type === 'pokemon').map(f => f.id as number) || []
    );
    const featuredItemIds = new Set(
      banner.featuredItems?.filter(f => f.type === 'item').map(f => f.id as string) || []
    );

    // Agregar Pokémon al pool
    for (const [rarity, pokemon] of Object.entries(pokemonPool) as [Rarity, PokemonPoolEntry[]][]) {
      const rarityKey = rarity as Rarity;
      const baseProb = BASE_PROBABILITIES[rarityKey];

      for (const p of pokemon) {
        const isFeatured = featuredPokemonIds.has(p.pokemonId);
        const weight = isFeatured 
          ? p.baseWeight * banner.rateUpMultiplier 
          : p.baseWeight;

        entries.push({
          type: 'pokemon',
          rarity: rarityKey,
          data: p,
          weight: weight * baseProb,
          isFeatured,
        });

        rarityWeights[rarityKey] += weight * baseProb;
      }
    }

    // Agregar items al pool (con menor peso que Pokémon)
    const itemWeightMultiplier = 0.3; // Items son 30% del pool
    
    for (const [rarity, items] of Object.entries(itemPool)) {
      const rarityKey = rarity as Rarity;
      const baseProb = BASE_PROBABILITIES[rarityKey];

      for (const item of items) {
        const isFeatured = featuredItemIds.has(item.itemId);
        const weight = isFeatured 
          ? item.baseWeight * banner.rateUpMultiplier 
          : item.baseWeight;

        entries.push({
          type: 'item',
          rarity: rarityKey,
          data: item,
          weight: weight * baseProb * itemWeightMultiplier,
          isFeatured,
        });

        rarityWeights[rarityKey] += weight * baseProb * itemWeightMultiplier;
      }
    }

    const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);

    return {
      entries,
      totalWeight,
      rarityWeights,
    };
  }

  /**
   * Calcula probabilidades ajustadas por pity
   */
  calculateAdjustedProbabilities(
    pool: RewardPool, 
    pityCount: number
  ): RewardPool {
    if (pityCount < PITY_CONFIG.softPityStart) {
      return pool;
    }

    // Calcular bonus de soft pity
    const softPityPulls = pityCount - PITY_CONFIG.softPityStart;
    const epicBonus = softPityPulls * PITY_CONFIG.softPityIncrement;

    // Hard pity: forzar Epic+
    const isHardPity = pityCount >= PITY_CONFIG.hardPity - 1;

    const adjustedEntries = pool.entries.map(entry => {
      if (isHardPity) {
        // En hard pity, solo Epic+ tienen peso
        if (['epic', 'legendary', 'mythic'].includes(entry.rarity)) {
          return { ...entry, weight: entry.weight * 10 };
        }
        return { ...entry, weight: 0 };
      }

      // Soft pity: aumentar peso de Epic+
      if (['epic', 'legendary', 'mythic'].includes(entry.rarity)) {
        const multiplier = 1 + (epicBonus / BASE_PROBABILITIES[entry.rarity]);
        return { ...entry, weight: entry.weight * multiplier };
      }

      return entry;
    });

    const totalWeight = adjustedEntries.reduce((sum, e) => sum + e.weight, 0);

    return {
      ...pool,
      entries: adjustedEntries,
      totalWeight,
    };
  }

  /**
   * Selecciona una recompensa del pool
   */
  selectReward(pool: RewardPool): SelectedReward {
    const weights = pool.entries.map(e => e.weight);
    const selected = this.rng.weightedSelect(pool.entries, weights);

    return {
      type: selected.type,
      rarity: selected.rarity,
      data: selected.data,
      isFeatured: selected.isFeatured,
    };
  }

  /**
   * Aplica el sistema 50/50 para items destacados
   * Si el jugador perdió el 50/50 anterior, garantiza el destacado
   */
  apply5050System(
    pool: RewardPool,
    banner: GachaBanner,
    selectedRarity: Rarity,
    lost5050: boolean
  ): SelectedReward | null {
    // Obtener items destacados de la rareza seleccionada
    const featuredOfRarity = [
      ...(banner.featuredPokemon?.filter(f => f.rarity === selectedRarity) || []),
      ...(banner.featuredItems?.filter(f => f.rarity === selectedRarity) || []),
    ];

    if (featuredOfRarity.length === 0) {
      return null; // No hay destacados de esta rareza
    }

    // Si perdió el 50/50 anterior, garantizar destacado
    if (lost5050) {
      const featured = this.rng.weightedSelect(
        featuredOfRarity,
        featuredOfRarity.map(() => 1)
      );
      return this.featuredToReward(featured, pool);
    }

    // 50/50: 50% de obtener el destacado
    if (this.rng.chance(0.5)) {
      const featured = this.rng.weightedSelect(
        featuredOfRarity,
        featuredOfRarity.map(() => 1)
      );
      return this.featuredToReward(featured, pool);
    }

    return null; // Perdió el 50/50
  }

  /**
   * Convierte un FeaturedItem a SelectedReward
   */
  private featuredToReward(featured: FeaturedItem, pool: RewardPool): SelectedReward {
    // Buscar en el pool
    const entry = pool.entries.find(e => {
      if (featured.type === 'pokemon' && e.type === 'pokemon') {
        return (e.data as PokemonPoolEntry).pokemonId === featured.id;
      }
      if (featured.type === 'item' && e.type === 'item') {
        return (e.data as ItemPoolEntry).itemId === featured.id;
      }
      return false;
    });

    if (entry) {
      return {
        type: entry.type,
        rarity: entry.rarity,
        data: entry.data,
        isFeatured: true,
      };
    }

    // Fallback: crear entrada desde featured
    if (featured.type === 'pokemon') {
      return {
        type: 'pokemon',
        rarity: featured.rarity,
        data: {
          pokemonId: featured.id as number,
          name: featured.name,
          nameEs: featured.nameEs,
          rarity: featured.rarity,
          baseWeight: 1,
        },
        isFeatured: true,
      };
    }

    return {
      type: 'item',
      rarity: featured.rarity,
      data: {
        itemId: featured.id as string,
        name: featured.name,
        nameEs: featured.nameEs,
        rarity: featured.rarity,
        baseWeight: 1,
        quantity: 1,
      },
      isFeatured: true,
    };
  }

  /**
   * Agrupa Pokémon por rareza
   */
  private groupByRarity(pokemon: PokemonPoolEntry[]): Record<Rarity, PokemonPoolEntry[]> {
    const result: Record<Rarity, PokemonPoolEntry[]> = {
      common: [],
      uncommon: [],
      rare: [],
      epic: [],
      legendary: [],
      mythic: [],
    };

    for (const p of pokemon) {
      result[p.rarity].push(p);
    }

    return result;
  }

  /**
   * Agrupa items por rareza
   */
  private groupItemsByRarity(items: ItemPoolEntry[]): Record<Rarity, ItemPoolEntry[]> {
    const result: Record<Rarity, ItemPoolEntry[]> = {
      common: [],
      uncommon: [],
      rare: [],
      epic: [],
      legendary: [],
      mythic: [],
    };

    for (const item of items) {
      result[item.rarity].push(item);
    }

    return result;
  }
}

// Singleton instance
export const poolBuilder = new PoolBuilderService();
