/**
 * Tipos del Sistema Pokemon Gacha
 * Cobblemon Los Pitufos - Backend API
 * 
 * Sistema de gacha tipo Genshin Impact para obtener Pokémon aleatorios
 */

import { ObjectId } from 'mongodb';
import { z } from 'zod';

// ============================================
// ENUMS Y CONSTANTES
// ============================================

/**
 * Niveles de rareza del gacha
 */
export const RARITY_LEVELS = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const;
export type Rarity = typeof RARITY_LEVELS[number];

/**
 * Probabilidades base por rareza (suman 100%)
 */
export const BASE_PROBABILITIES: Record<Rarity, number> = {
  common: 0.60,      // 60%
  uncommon: 0.25,    // 25%
  rare: 0.10,        // 10%
  epic: 0.04,        // 4%
  legendary: 0.006,  // 0.6%
  mythic: 0.000001,  // 0.0001%
};

/**
 * Rangos de IVs por rareza
 */
export const IV_RANGES: Record<Rarity, { min: number; max: number }> = {
  common: { min: 0, max: 15 },
  uncommon: { min: 5, max: 20 },
  rare: { min: 10, max: 25 },
  epic: { min: 15, max: 28 },
  legendary: { min: 20, max: 30 },
  mythic: { min: 25, max: 31 },
};

/**
 * Costos de tiradas
 */
export const PULL_COSTS = {
  single: 500,
  multi: 4500, // 10% descuento
} as const;

/**
 * Configuración de pity
 */
export const PITY_CONFIG = {
  softPityStart: 75,
  hardPity: 90,
  softPityIncrement: 0.05, // 5% por tirada después de soft pity
} as const;

/**
 * Probabilidad de shiny
 */
export const SHINY_RATE = 1 / 4096; // 0.0244%

// ============================================
// INTERFACES DE BANNER
// ============================================

/**
 * Item destacado en un banner
 */
export interface FeaturedItem {
  type: 'pokemon' | 'item';
  id: number | string;
  name: string;
  nameEs?: string;
  rarity: Rarity;
  sprite: string;
}

/**
 * Entrada de Pokémon en el pool
 */
export interface PokemonPoolEntry {
  pokemonId: number;
  name: string;
  nameEs?: string;
  rarity: Rarity;
  baseWeight: number;
  types?: string[];
}

/**
 * Entrada de item en el pool
 */
export interface ItemPoolEntry {
  itemId: string;
  name: string;
  nameEs?: string;
  rarity: Rarity;
  baseWeight: number;
  quantity: number;
  sprite?: string;
}

/**
 * Banner de gacha
 */
export interface GachaBanner {
  _id?: ObjectId;
  bannerId: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs?: string;
  artwork: string;
  type: 'standard' | 'limited' | 'event';
  
  // Timing
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  
  // Featured content
  featuredPokemon: FeaturedItem[];
  featuredItems: FeaturedItem[];
  rateUpMultiplier: number;
  
  // Pool configuration
  pokemonPool: PokemonPoolEntry[];
  itemPool: ItemPoolEntry[];
  
  // Costs
  singlePullCost: number;
  multiPullCost: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ============================================
// INTERFACES DE RECOMPENSA
// ============================================

/**
 * IVs de un Pokémon
 */
export interface PokemonIVs {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

/**
 * Datos de Pokémon en recompensa
 */
export interface GachaPokemonData {
  pokemonId: number;
  name: string;
  nameEs: string;
  level: number;
  isShiny: boolean;
  ivs: PokemonIVs;
  nature: string;
  ability: string;
  types?: string[];
  sprite?: string;
  spriteShiny?: string;
}

/**
 * Datos de item en recompensa
 */
export interface GachaItemData {
  itemId: string;
  name: string;
  nameEs?: string;
  quantity: number;
  sprite?: string;
}

/**
 * Estado de entrega de recompensa
 */
export type RewardStatus = 'pending' | 'claimed' | 'expired';

/**
 * Recompensa del gacha
 */
export interface GachaReward {
  _id?: ObjectId;
  rewardId: string;
  playerId: string;
  bannerId: string;
  bannerName: string;
  
  type: 'pokemon' | 'item';
  pokemon?: GachaPokemonData;
  item?: GachaItemData;
  
  rarity: Rarity;
  isShiny: boolean;
  isFeatured: boolean;
  
  status: RewardStatus;
  claimedAt?: Date;
  
  pulledAt: Date;
  idempotencyKey: string;
}

// ============================================
// INTERFACES DE PITY
// ============================================

/**
 * Estado de pity de un jugador
 */
export interface GachaPity {
  _id?: ObjectId;
  playerId: string;
  bannerId: string;
  bannerType: 'standard' | 'limited' | 'event';
  
  // Pity counters
  pullsSinceEpic: number;
  pullsSinceLegendary: number;
  
  // 50/50 tracking
  lost5050: boolean;
  
  // Statistics
  totalPulls: number;
  totalSpent: number;
  
  updatedAt: Date;
}

/**
 * Estado de pity para respuesta API
 */
export interface PityStatus {
  pullsSinceEpic: number;
  pullsSinceLegendary: number;
  lost5050: boolean;
  totalPulls: number;
  totalSpent: number;
  softPityActive: boolean;
  pullsUntilHardPity: number;
  currentEpicChance: number;
}

// ============================================
// INTERFACES DE HISTORIAL
// ============================================

/**
 * Entrada de historial de tiradas
 */
export interface GachaHistoryEntry {
  _id?: ObjectId;
  playerId: string;
  bannerId: string;
  bannerName: string;
  
  reward: GachaReward;
  rarity: Rarity;
  isShiny: boolean;
  isFeatured: boolean;
  
  pityAtPull: number;
  cost: number;
  
  pulledAt: Date;
}

/**
 * Filtros para historial
 */
export interface HistoryFilters {
  bannerId?: string;
  rarity?: Rarity;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// ============================================
// INTERFACES DE ESTADÍSTICAS
// ============================================

/**
 * Distribución de rareza
 */
export interface RarityDistribution {
  common: number;
  uncommon: number;
  rare: number;
  epic: number;
  legendary: number;
  mythic: number;
}

/**
 * Estadísticas del jugador
 */
export interface GachaStats {
  totalPulls: number;
  totalSpent: number;
  rarityDistribution: RarityDistribution;
  shinyCount: number;
  featuredCount: number;
  pokemonCount: number;
  itemCount: number;
  averagePityToEpic: number;
  luckRating: number; // Comparado con probabilidades base
}

// ============================================
// INTERFACES DE RESULTADOS
// ============================================

/**
 * Resultado de una tirada simple
 */
export interface GachaPullResult {
  success: true;
  reward: GachaReward;
  newBalance: number;
  pityStatus: PityStatus;
  message: string;
}

/**
 * Resultado de multi-pull
 */
export interface GachaMultiPullResult {
  success: true;
  rewards: GachaReward[];
  newBalance: number;
  pityStatus: PityStatus;
  message: string;
  highlights: {
    epicOrBetter: number;
    shinies: number;
    featured: number;
  };
}

// ============================================
// INTERFACES DE ENTREGA PENDIENTE
// ============================================

/**
 * Recompensa pendiente de entrega
 */
export interface PendingGachaReward {
  _id?: ObjectId;
  rewardId: string;
  playerId: string;
  playerUuid?: string;
  
  type: 'pokemon' | 'item';
  pokemon?: GachaPokemonData;
  item?: GachaItemData;
  
  rarity: Rarity;
  isShiny: boolean;
  
  status: 'pending' | 'delivering' | 'claimed' | 'failed';
  deliveryAttempts: number;
  lastDeliveryAttempt?: Date;
  claimedAt?: Date;
  failureReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// INTERFACES DE ADMIN
// ============================================

/**
 * Datos para crear banner
 */
export interface CreateBannerData {
  name: string;
  nameEs: string;
  description: string;
  descriptionEs?: string;
  artwork: string;
  type: 'standard' | 'limited' | 'event';
  startDate: Date;
  endDate?: Date | null;
  featuredPokemon?: FeaturedItem[];
  featuredItems?: FeaturedItem[];
  rateUpMultiplier?: number;
  pokemonPool?: PokemonPoolEntry[];
  itemPool?: ItemPoolEntry[];
  singlePullCost?: number;
  multiPullCost?: number;
}

/**
 * Datos para actualizar banner
 */
export interface UpdateBannerData {
  name?: string;
  nameEs?: string;
  description?: string;
  descriptionEs?: string;
  artwork?: string;
  startDate?: Date;
  endDate?: Date | null;
  isActive?: boolean;
  featuredPokemon?: FeaturedItem[];
  featuredItems?: FeaturedItem[];
  rateUpMultiplier?: number;
  pokemonPool?: PokemonPoolEntry[];
  itemPool?: ItemPoolEntry[];
  singlePullCost?: number;
  multiPullCost?: number;
}

/**
 * Log de acción de admin
 */
export interface AdminActionLog {
  _id?: ObjectId;
  adminId: string;
  adminUsername: string;
  action: 'create_banner' | 'update_banner' | 'deactivate_banner' | 'delete_banner';
  targetBannerId: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

// ============================================
// CÓDIGOS DE ERROR
// ============================================

export enum GachaErrorCode {
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  BANNER_NOT_FOUND = 'BANNER_NOT_FOUND',
  BANNER_EXPIRED = 'BANNER_EXPIRED',
  BANNER_NOT_STARTED = 'BANNER_NOT_STARTED',
  INVALID_PULL_COUNT = 'INVALID_PULL_COUNT',
  DUPLICATE_REQUEST = 'DUPLICATE_REQUEST',
  REWARD_NOT_FOUND = 'REWARD_NOT_FOUND',
  REWARD_ALREADY_CLAIMED = 'REWARD_ALREADY_CLAIMED',
  PLAYER_NOT_FOUND = 'PLAYER_NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Error del gacha
 */
export interface GachaError {
  success: false;
  error: {
    code: GachaErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================
// ESQUEMAS DE VALIDACIÓN ZOD
// ============================================

/**
 * Esquema para tirada simple
 */
export const PullRequestSchema = z.object({
  bannerId: z.string().min(1, 'Banner ID es requerido'),
  idempotencyKey: z.string().min(1, 'Idempotency key es requerida'),
});

/**
 * Esquema para multi-pull
 */
export const MultiPullRequestSchema = z.object({
  bannerId: z.string().min(1, 'Banner ID es requerido'),
  idempotencyKey: z.string().min(1, 'Idempotency key es requerida'),
});

/**
 * Esquema para filtros de historial
 */
export const HistoryFiltersSchema = z.object({
  bannerId: z.string().optional(),
  rarity: z.enum(RARITY_LEVELS).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).optional().default(100),
  offset: z.number().min(0).optional().default(0),
});

/**
 * Esquema para crear banner
 */
export const CreateBannerSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  nameEs: z.string().min(1, 'Nombre en español es requerido'),
  description: z.string().min(1, 'Descripción es requerida'),
  descriptionEs: z.string().optional(),
  artwork: z.string().url('Artwork debe ser una URL válida'),
  type: z.enum(['standard', 'limited', 'event']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullable().optional(),
  featuredPokemon: z.array(z.object({
    type: z.literal('pokemon'),
    id: z.number(),
    name: z.string(),
    nameEs: z.string().optional(),
    rarity: z.enum(RARITY_LEVELS),
    sprite: z.string(),
  })).optional(),
  featuredItems: z.array(z.object({
    type: z.literal('item'),
    id: z.string(),
    name: z.string(),
    nameEs: z.string().optional(),
    rarity: z.enum(RARITY_LEVELS),
    sprite: z.string(),
  })).optional(),
  rateUpMultiplier: z.number().min(1).max(10).optional().default(5),
  singlePullCost: z.number().min(1).optional().default(500),
  multiPullCost: z.number().min(1).optional().default(4500),
});

/**
 * Esquema para actualizar banner
 */
export const UpdateBannerSchema = CreateBannerSchema.partial();

/**
 * Esquema para claim de recompensa
 */
export const ClaimRewardSchema = z.object({
  rewardId: z.string().min(1, 'Reward ID es requerido'),
});
