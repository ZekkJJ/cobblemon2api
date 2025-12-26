/**
 * Pokemon Gacha Schemas
 * Cobblemon Los Pitufos - Backend API
 * 
 * Esquemas de validación Zod para el sistema gacha
 * Re-exporta los esquemas definidos en types para uso en el módulo
 */

export {
  // Esquemas de validación
  PullRequestSchema,
  MultiPullRequestSchema,
  HistoryFiltersSchema,
  CreateBannerSchema,
  UpdateBannerSchema,
  ClaimRewardSchema,
  
  // Constantes
  RARITY_LEVELS,
  BASE_PROBABILITIES,
  IV_RANGES,
  PULL_COSTS,
  PITY_CONFIG,
  SHINY_RATE,
  
  // Tipos
  type Rarity,
  type GachaBanner,
  type GachaReward,
  type GachaPity,
  type PityStatus,
  type GachaHistoryEntry,
  type HistoryFilters,
  type GachaStats,
  type GachaPullResult,
  type GachaMultiPullResult,
  type PendingGachaReward,
  type CreateBannerData,
  type UpdateBannerData,
  type FeaturedItem,
  type PokemonPoolEntry,
  type ItemPoolEntry,
  type GachaPokemonData,
  type GachaItemData,
  type PokemonIVs,
  type RarityDistribution,
  type RewardStatus,
  type AdminActionLog,
  type GachaError,
  GachaErrorCode,
} from '../../shared/types/pokemon-gacha.types.js';
