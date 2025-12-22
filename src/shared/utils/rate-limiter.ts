/**
 * Utilidades de Rate Limiting
 * Cobblemon Los Pitufos - Backend API
 * 
 * Este módulo proporciona funcionalidades de rate limiting
 * para proteger la API de abuso y sobrecarga.
 */

import rateLimit, { RateLimitRequestHandler, Options } from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '../../config/env.js';
import { ErrorCode } from '../middleware/error-handler.js';

/**
 * Respuesta estándar cuando se excede el rate limit
 */
const rateLimitResponse = {
  success: false,
  error: 'Demasiadas solicitudes. Por favor, espera un momento antes de intentar de nuevo.',
  code: ErrorCode.RATE_LIMIT_EXCEEDED,
};

/**
 * Obtiene la clave de identificación para rate limiting
 * Usa IP del cliente considerando proxies
 */
function getKeyGenerator(req: Request): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  
  if (typeof forwardedFor === 'string') {
    const firstIp = forwardedFor.split(',')[0];
    return firstIp?.trim() || req.ip || 'unknown';
  }
  
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Opciones base para rate limiters
 */
const baseOptions: Partial<Options> = {
  standardHeaders: true, // Incluye RateLimit-* headers
  legacyHeaders: false,
  keyGenerator: getKeyGenerator,
  handler: (req: Request, res: Response) => {
    // Calcular Retry-After en segundos (60 segundos por defecto)
    const retryAfter = 60;
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json(rateLimitResponse);
  },
};

/**
 * Rate limiter general para endpoints de lectura
 * 100 solicitudes por minuto por IP
 */
export const generalRateLimiter: RateLimitRequestHandler = rateLimit({
  ...baseOptions,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: rateLimitResponse,
});

/**
 * Rate limiter estricto para endpoints de escritura
 * 20 solicitudes por minuto por IP
 */
export const strictRateLimiter: RateLimitRequestHandler = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000, // 1 minuto
  max: 20,
  message: rateLimitResponse,
});

/**
 * Rate limiter para sincronización del plugin de Minecraft
 * 60 solicitudes por minuto por IP
 */
export const syncRateLimiter: RateLimitRequestHandler = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000, // 1 minuto
  max: env.SYNC_RATE_LIMIT_MAX,
  message: rateLimitResponse,
});

/**
 * Rate limiter para autenticación
 * 10 intentos por 15 minutos por IP
 */
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: {
    success: false,
    error: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.',
    code: ErrorCode.RATE_LIMIT_EXCEEDED,
  },
});

/**
 * Rate limiter para el gacha
 * 5 intentos por minuto por IP (prevenir spam de tiradas)
 */
export const gachaRateLimiter: RateLimitRequestHandler = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000, // 1 minuto
  max: 5,
  message: {
    success: false,
    error: 'Demasiados intentos de tirada. Espera un momento.',
    code: ErrorCode.RATE_LIMIT_EXCEEDED,
  },
});

/**
 * Rate limiter para compras en la tienda
 * 30 compras por minuto por IP
 */
export const shopRateLimiter: RateLimitRequestHandler = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000, // 1 minuto
  max: 30,
  message: {
    success: false,
    error: 'Demasiadas compras. Espera un momento.',
    code: ErrorCode.RATE_LIMIT_EXCEEDED,
  },
});

// ============================================
// RATE LIMITER EN MEMORIA POR UUID
// ============================================

/**
 * Cache en memoria para rate limiting por UUID
 * Usado para sincronización de jugadores específicos
 */
const uuidRateLimitCache = new Map<string, { count: number; resetAt: number }>();

/**
 * Limpia entradas expiradas del cache
 */
function cleanupUuidCache(): void {
  const now = Date.now();
  for (const [key, value] of uuidRateLimitCache.entries()) {
    if (now > value.resetAt) {
      uuidRateLimitCache.delete(key);
    }
  }
}

// Limpiar cache cada 5 minutos
setInterval(cleanupUuidCache, 5 * 60 * 1000);

/**
 * Verifica rate limit por UUID
 * @param uuid - UUID del jugador
 * @param maxRequests - Máximo de solicitudes permitidas
 * @param windowMs - Ventana de tiempo en milisegundos
 * @returns true si está dentro del límite, false si excedió
 */
export function checkUuidRateLimit(
  uuid: string,
  maxRequests: number = 12,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = `uuid:${uuid}`;
  
  const existing = uuidRateLimitCache.get(key);
  
  if (!existing || now > existing.resetAt) {
    // Nueva ventana
    uuidRateLimitCache.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }
  
  if (existing.count >= maxRequests) {
    return false;
  }
  
  existing.count++;
  return true;
}

/**
 * Obtiene el tiempo restante hasta que se resetee el rate limit
 * @param uuid - UUID del jugador
 * @returns Milisegundos restantes o 0 si no hay límite activo
 */
export function getUuidRateLimitReset(uuid: string): number {
  const key = `uuid:${uuid}`;
  const existing = uuidRateLimitCache.get(key);
  
  if (!existing) return 0;
  
  const remaining = existing.resetAt - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * Crea un rate limiter personalizado
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
}): RateLimitRequestHandler {
  return rateLimit({
    ...baseOptions,
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      error: options.message || rateLimitResponse.error,
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
    },
  });
}
