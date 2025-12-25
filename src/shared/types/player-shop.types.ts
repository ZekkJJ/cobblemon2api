/**
 * Player Shop Types
 * Cobblemon Los Pitufos - Backend API
 * 
 * Define las interfaces y tipos para el sistema de mercado de jugadores.
 */

import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { Pokemon, PokemonStats, PokemonMove } from './pokemon.types.js';

// ============================================
// PITUFIPUNTOS TYPES
// ============================================

/**
 * Desglose de Pitufipuntos
 */
export interface PitufipuntosBreakdown {
  baseStatTotal: number;
  ivBonus: number;        // IVTotal * 2
  evBonus: number;        // EVTotal / 4
  levelBonus: number;     // level * 5
  natureBonus: number;    // 0-150 based on nature alignment
  abilityBonus: number;   // 100 if hidden ability
  shinyBonus: number;     // 200 if shiny
  typeBonus: number;      // Based on type effectiveness
}

/**
 * Resultado del cálculo de Pitufipuntos
 */
export interface PitufipuntosResult {
  total: number;
  breakdown: PitufipuntosBreakdown;
}

// ============================================
// LISTING TYPES
// ============================================

/**
 * Método de venta
 */
export type SaleMethod = 'direct' | 'bidding';

/**
 * Estado del listing
 */
export type ListingStatus = 'active' | 'sold' | 'cancelled' | 'expired';

/**
 * Pokémon en listing (snapshot)
 */
export interface ListingPokemon {
  uuid: string;
  species: string;
  speciesId: number;
  nickname?: string;
  level: number;
  shiny: boolean;
  gender: 'male' | 'female' | 'genderless';
  nature: string;
  ability: string;
  ivs: PokemonStats;
  evs: PokemonStats;
  moves: PokemonMove[];
  ball: string;
  form?: string;
  originalTrainer?: string;
}

/**
 * Listing completo
 */
export interface Listing {
  _id?: ObjectId;
  
  // Vendedor
  sellerId: string;           // minecraftUuid
  sellerUsername: string;
  
  // Pokémon (snapshot al momento del listing)
  pokemon: ListingPokemon;
  
  // Pitufipuntos calculados
  pitufipuntos: PitufipuntosResult;
  
  // Configuración de venta
  saleMethod: SaleMethod;
  price?: number;              // Para compra directa
  startingBid?: number;        // Para bidding
  currentBid?: number;         // Puja actual más alta
  currentBidderId?: string;    // UUID del pujador actual
  currentBidderUsername?: string;
  bidCount: number;
  
  // Timing
  duration?: number;           // Horas (24-72 para bidding)
  expiresAt?: Date;            // Para bidding
  createdAt: Date;
  
  // Estado
  status: ListingStatus;
  soldAt?: Date;
  buyerId?: string;
  buyerUsername?: string;
  finalPrice?: number;
  
  // Métricas
  viewCount: number;
}

/**
 * Opciones para crear listing
 */
export interface CreateListingOptions {
  saleMethod: SaleMethod;
  price?: number;              // Requerido para direct
  startingBid?: number;        // Requerido para bidding
  duration?: number;           // Requerido para bidding (24-72 horas)
}

/**
 * Filtros para buscar listings
 */
export interface ListingFilters {
  species?: string;
  speciesId?: number;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  shinyOnly?: boolean;
  saleMethod?: SaleMethod;
  sortBy?: 'pitufipuntos' | 'price' | 'createdAt' | 'expiresAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Resultado paginado de listings
 */
export interface PaginatedListings {
  listings: Listing[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Detalle de listing para vista
 */
export interface ListingDetail extends Listing {
  sellerOnline?: boolean;
  timeRemaining?: number;      // Milisegundos restantes para subastas
}

// ============================================
// BID TYPES
// ============================================

/**
 * Estado de una puja
 */
export type BidStatus = 'active' | 'outbid' | 'won' | 'refunded';

/**
 * Puja en una subasta
 */
export interface Bid {
  _id?: ObjectId;
  listingId: ObjectId;
  bidderId: string;           // minecraftUuid
  bidderUsername: string;
  amount: number;
  reservedFromBalance: boolean;
  createdAt: Date;
  status: BidStatus;
  refundedAt?: Date;
}

/**
 * Resultado de colocar una puja
 */
export interface BidResult {
  success: boolean;
  bid?: Bid;
  newBalance?: number;
  message: string;
  previousBidder?: {
    uuid: string;
    username: string;
    refundedAmount: number;
  };
}

// ============================================
// DELIVERY TYPES
// ============================================

/**
 * Tipo de entrega pendiente
 */
export type DeliveryType = 'purchase' | 'auction_win' | 'escrow_return';

/**
 * Estado de entrega
 */
export type DeliveryStatus = 'pending' | 'delivered' | 'failed';

/**
 * Entrega pendiente
 */
export interface PendingDelivery {
  _id?: ObjectId;
  recipientUuid: string;
  recipientUsername: string;
  
  type: DeliveryType;
  
  // Pokémon completo para entregar
  pokemon: Pokemon;
  
  // Referencia al listing original
  sourceListingId?: ObjectId;
  
  // Timestamps y estado
  createdAt: Date;
  deliveredAt?: Date;
  status: DeliveryStatus;
  deliveryAttempts: number;
  lastAttemptAt?: Date;
  failureReason?: string;
}

// ============================================
// TRANSACTION TYPES
// ============================================

/**
 * Resultado de compra directa
 */
export interface PurchaseResult {
  success: boolean;
  listing?: Listing;
  newBuyerBalance?: number;
  newSellerBalance?: number;
  deliveryId?: string;
  message: string;
}

// ============================================
// ZOD SCHEMAS
// ============================================

/**
 * Schema para crear listing
 */
export const CreateListingSchema = z.object({
  pokemonUuid: z.string().min(1, 'Pokemon UUID es requerido'),
  saleMethod: z.enum(['direct', 'bidding']),
  price: z.number().min(100).max(10000000).optional(),
  startingBid: z.number().min(100).max(10000000).optional(),
  duration: z.number().min(24).max(72).optional(),
}).refine(
  (data) => {
    if (data.saleMethod === 'direct') {
      return data.price !== undefined && data.price >= 100 && data.price <= 10000000;
    }
    return true;
  },
  { message: 'Precio requerido para compra directa (100 - 10,000,000)', path: ['price'] }
).refine(
  (data) => {
    if (data.saleMethod === 'bidding') {
      return data.startingBid !== undefined && data.startingBid >= 100;
    }
    return true;
  },
  { message: 'Puja inicial requerida para subasta (mínimo 100)', path: ['startingBid'] }
).refine(
  (data) => {
    if (data.saleMethod === 'bidding') {
      return data.duration !== undefined && data.duration >= 24 && data.duration <= 72;
    }
    return true;
  },
  { message: 'Duración requerida para subasta (24-72 horas)', path: ['duration'] }
);

/**
 * Schema para filtros de listing
 */
export const ListingFiltersSchema = z.object({
  species: z.string().optional(),
  speciesId: z.number().optional(),
  type: z.string().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().max(10000000).optional(),
  shinyOnly: z.boolean().optional(),
  saleMethod: z.enum(['direct', 'bidding']).optional(),
  sortBy: z.enum(['pitufipuntos', 'price', 'createdAt', 'expiresAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

/**
 * Schema para colocar puja
 */
export const PlaceBidSchema = z.object({
  amount: z.number().min(100, 'Puja mínima es 100 CobbleDollars'),
});

/**
 * Schema para marcar entrega
 */
export const MarkDeliveredSchema = z.object({
  deliveryId: z.string().min(1, 'Delivery ID es requerido'),
});

// ============================================
// TYPE INFERENCE
// ============================================

export type CreateListingInput = z.infer<typeof CreateListingSchema>;
export type ListingFiltersInput = z.infer<typeof ListingFiltersSchema>;
export type PlaceBidInput = z.infer<typeof PlaceBidSchema>;
export type MarkDeliveredInput = z.infer<typeof MarkDeliveredSchema>;

// ============================================
// CONSTANTS
// ============================================

/**
 * Configuración de precios
 */
export const PRICE_LIMITS = {
  MIN: 100,
  MAX: 10000000,
} as const;

/**
 * Configuración de subastas
 */
export const AUCTION_CONFIG = {
  MIN_DURATION_HOURS: 24,
  MAX_DURATION_HOURS: 72,
  MIN_BID_INCREMENT_PERCENT: 5,
} as const;

/**
 * Configuración de entregas
 */
export const DELIVERY_CONFIG = {
  MAX_ATTEMPTS: 10,
  POLL_INTERVAL_SECONDS: 15,
} as const;
