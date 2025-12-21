/**
 * Tipos de Tienda
 * Cobblemon Los Pitufos - Backend API
 * 
 * Define las interfaces y tipos relacionados con la tienda de Pokéballs.
 */

import { ObjectId } from 'mongodb';
import { z } from 'zod';

// ============================================
// INTERFACES PRINCIPALES
// ============================================

/**
 * Definición de una Pokéball
 */
export interface Pokeball {
  id: string;
  name: string;
  type: 'standard' | 'special' | 'apricorn' | 'ancient';
  catchRate: number;
  basePrice: number;
  description: string;
  sprite: string;
  minStock: number;
  maxStock: number;
}

/**
 * Stock de una Pokéball específica
 */
export interface BallStock {
  ballId: string;
  stock: number;
  price: number;
  maxStock: number;
  lastRefresh: number;
}

/**
 * Documento de stock de la tienda
 */
export interface ShopStock {
  _id?: ObjectId;
  id: 'current';
  stocks: Record<string, BallStock>;
  lastRefresh: number;
}

/**
 * Item de compra individual
 */
export interface PurchaseItem {
  ballId: string;
  ballName: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  purchasedAt: string;
  claimed: boolean;
  claimedAt?: string;
}

/**
 * Documento de compras de un jugador
 */
export interface ShopPurchase {
  _id?: ObjectId;
  uuid: string;
  username: string;
  pending: PurchaseItem[];
}

/**
 * Pokéball con información de stock actual
 */
export interface PokeballWithStock extends Pokeball {
  currentStock: number;
  currentPrice: number;
}

/**
 * Solicitud de compra
 */
export interface PurchaseRequest {
  uuid: string;
  username: string;
  ballId: string;
  quantity: number;
}

/**
 * Respuesta de compra exitosa
 */
export interface PurchaseResponse {
  success: true;
  purchase: PurchaseItem;
  newBalance: number;
  message: string;
}

/**
 * Solicitud de reclamar compras
 */
export interface ClaimRequest {
  uuid: string;
  purchaseIndices?: number[]; // Si no se especifica, reclama todas
}

/**
 * Respuesta de reclamar compras
 */
export interface ClaimResponse {
  success: true;
  claimed: PurchaseItem[];
  message: string;
}

/**
 * Respuesta de stock de la tienda
 */
export interface StockResponse {
  balls: PokeballWithStock[];
  nextRefresh: number;
}

/**
 * Respuesta de balance del jugador
 */
export interface BalanceResponse {
  uuid: string;
  username: string;
  balance: number;
}

// ============================================
// CONSTANTES
// ============================================

/**
 * Intervalo de regeneración de stock (1 hora en ms)
 */
export const STOCK_REFRESH_INTERVAL = 3600000;

/**
 * Probabilidad de que aparezca Master Ball (5%)
 */
export const MASTER_BALL_CHANCE = 0.05;

/**
 * Cantidad de bolas especiales aleatorias por refresh
 */
export const SPECIAL_BALLS_PER_REFRESH = 2;

/**
 * Umbrales de precio dinámico
 */
export const PRICE_THRESHOLDS = {
  CRITICAL: 0.1,   // < 10% stock = 3x precio
  LOW: 0.25,       // < 25% stock = 2x precio
  MEDIUM: 0.5,     // < 50% stock = 1.5x precio
} as const;

/**
 * Multiplicadores de precio
 */
export const PRICE_MULTIPLIERS = {
  CRITICAL: 3.0,
  LOW: 2.0,
  MEDIUM: 1.5,
  NORMAL: 1.0,
} as const;

// ============================================
// ESQUEMAS DE VALIDACIÓN ZOD
// ============================================

/**
 * Esquema para solicitud de compra
 */
export const PurchaseRequestSchema = z.object({
  uuid: z.string().min(1, 'UUID es requerido'),
  username: z.string().min(1, 'Username es requerido'),
  ballId: z.string().min(1, 'ID de Pokéball es requerido'),
  quantity: z.number().int().min(1, 'Cantidad debe ser al menos 1').max(99, 'Cantidad máxima es 99'),
});

/**
 * Esquema para solicitud de reclamar
 */
export const ClaimRequestSchema = z.object({
  uuid: z.string().min(1, 'UUID es requerido'),
  purchaseIndices: z.array(z.number().int().min(0)).optional(),
});

/**
 * Esquema para consulta de balance
 */
export const BalanceQuerySchema = z.object({
  uuid: z.string().min(1, 'UUID es requerido'),
});

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Genera stock aleatorio para una Pokéball
 */
export function getRandomStock(ball: Pokeball): number {
  return Math.floor(Math.random() * (ball.maxStock - ball.minStock + 1)) + ball.minStock;
}

/**
 * Calcula el precio basado en el stock disponible
 */
export function getPriceWithStock(basePrice: number, stock: number, maxStock: number): number {
  const stockRatio = stock / maxStock;
  
  if (stockRatio < PRICE_THRESHOLDS.CRITICAL) {
    return Math.floor(basePrice * PRICE_MULTIPLIERS.CRITICAL);
  }
  if (stockRatio < PRICE_THRESHOLDS.LOW) {
    return Math.floor(basePrice * PRICE_MULTIPLIERS.LOW);
  }
  if (stockRatio < PRICE_THRESHOLDS.MEDIUM) {
    return Math.floor(basePrice * PRICE_MULTIPLIERS.MEDIUM);
  }
  
  return basePrice;
}

/**
 * Verifica si el stock está bajo (menos del 25%)
 */
export function isLowStock(stock: number, maxStock: number): boolean {
  return (stock / maxStock) < PRICE_THRESHOLDS.LOW;
}

/**
 * Calcula el tiempo hasta el próximo refresh
 */
export function getTimeUntilRefresh(lastRefresh: number): number {
  const nextRefresh = lastRefresh + STOCK_REFRESH_INTERVAL;
  const remaining = nextRefresh - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * Verifica si es hora de regenerar el stock
 */
export function shouldRefreshStock(lastRefresh: number): boolean {
  return Date.now() - lastRefresh > STOCK_REFRESH_INTERVAL;
}

/**
 * Crea un item de compra
 */
export function createPurchaseItem(
  ball: Pokeball,
  quantity: number,
  currentPrice: number
): PurchaseItem {
  return {
    ballId: ball.id,
    ballName: ball.name,
    quantity,
    pricePerUnit: currentPrice,
    totalPrice: currentPrice * quantity,
    purchasedAt: new Date().toISOString(),
    claimed: false,
  };
}

/**
 * Calcula el total de compras pendientes
 */
export function calculatePendingTotal(purchases: PurchaseItem[]): number {
  return purchases
    .filter(p => !p.claimed)
    .reduce((total, p) => total + p.quantity, 0);
}
