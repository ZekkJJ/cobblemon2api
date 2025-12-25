/**
 * Player Shop Schemas
 * Cobblemon Los Pitufos - Backend API
 * 
 * Esquemas de validación Zod para el módulo de Player Shop.
 */

import { z } from 'zod';
import { PRICE_LIMITS, AUCTION_CONFIG } from '../../shared/types/player-shop.types.js';

/**
 * Schema para crear listing
 */
export const createListingSchema = z.object({
  pokemonUuid: z.string().min(1, 'Pokemon UUID es requerido'),
  saleMethod: z.enum(['direct', 'bidding'], {
    errorMap: () => ({ message: 'Método de venta debe ser "direct" o "bidding"' }),
  }),
  price: z.number()
    .min(PRICE_LIMITS.MIN, `Precio mínimo es ${PRICE_LIMITS.MIN} CobbleDollars`)
    .max(PRICE_LIMITS.MAX, `Precio máximo es ${PRICE_LIMITS.MAX.toLocaleString()} CobbleDollars`)
    .optional(),
  startingBid: z.number()
    .min(PRICE_LIMITS.MIN, `Puja inicial mínima es ${PRICE_LIMITS.MIN} CobbleDollars`)
    .max(PRICE_LIMITS.MAX, `Puja inicial máxima es ${PRICE_LIMITS.MAX.toLocaleString()} CobbleDollars`)
    .optional(),
  duration: z.number()
    .min(AUCTION_CONFIG.MIN_DURATION_HOURS, `Duración mínima es ${AUCTION_CONFIG.MIN_DURATION_HOURS} horas`)
    .max(AUCTION_CONFIG.MAX_DURATION_HOURS, `Duración máxima es ${AUCTION_CONFIG.MAX_DURATION_HOURS} horas`)
    .optional(),
}).refine(
  (data) => {
    if (data.saleMethod === 'direct') {
      return data.price !== undefined;
    }
    return true;
  },
  { message: 'Precio es requerido para compra directa', path: ['price'] }
).refine(
  (data) => {
    if (data.saleMethod === 'bidding') {
      return data.startingBid !== undefined;
    }
    return true;
  },
  { message: 'Puja inicial es requerida para subasta', path: ['startingBid'] }
).refine(
  (data) => {
    if (data.saleMethod === 'bidding') {
      return data.duration !== undefined;
    }
    return true;
  },
  { message: 'Duración es requerida para subasta', path: ['duration'] }
);

/**
 * Schema para filtros de búsqueda
 */
export const listingFiltersSchema = z.object({
  species: z.string().optional(),
  speciesId: z.coerce.number().optional(),
  type: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().max(PRICE_LIMITS.MAX).optional(),
  shinyOnly: z.coerce.boolean().optional(),
  saleMethod: z.enum(['direct', 'bidding']).optional(),
  sortBy: z.enum(['pitufipuntos', 'price', 'createdAt', 'expiresAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

/**
 * Schema para colocar puja
 */
export const placeBidSchema = z.object({
  amount: z.number()
    .min(PRICE_LIMITS.MIN, `Puja mínima es ${PRICE_LIMITS.MIN} CobbleDollars`),
});

/**
 * Schema para ID de listing
 */
export const listingIdSchema = z.object({
  id: z.string().min(1, 'Listing ID es requerido'),
});

/**
 * Schema para marcar entrega completada
 */
export const markDeliveredSchema = z.object({
  deliveryId: z.string().min(1, 'Delivery ID es requerido'),
});

/**
 * Schema para UUID de jugador (query param)
 */
export const playerUuidSchema = z.object({
  uuid: z.string().min(1, 'UUID de jugador es requerido'),
});

// Type exports
export type CreateListingInput = z.infer<typeof createListingSchema>;
export type ListingFiltersInput = z.infer<typeof listingFiltersSchema>;
export type PlaceBidInput = z.infer<typeof placeBidSchema>;
export type ListingIdInput = z.infer<typeof listingIdSchema>;
export type MarkDeliveredInput = z.infer<typeof markDeliveredSchema>;
export type PlayerUuidInput = z.infer<typeof playerUuidSchema>;
