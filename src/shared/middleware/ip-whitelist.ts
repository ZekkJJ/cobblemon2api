/**
 * Middleware de Lista Blanca de IPs
 * Cobblemon Los Pitufos - Backend API
 * 
 * Este middleware verifica que las solicitudes provengan
 * de IPs autorizadas (principalmente para el plugin de Minecraft).
 */

import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.js';
import { Errors, asyncHandler } from './error-handler.js';

/**
 * Obtiene la IP real del cliente considerando proxies
 */
export function getClientIp(req: Request): string {
  // Headers comunes de proxy
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  
  if (typeof forwardedFor === 'string') {
    // x-forwarded-for puede contener múltiples IPs separadas por coma
    const firstIp = forwardedFor.split(',')[0];
    return firstIp?.trim() || req.ip || 'unknown';
  }
  
  if (typeof realIp === 'string') {
    return realIp;
  }
  
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Normaliza una dirección IP para comparación
 * Convierte IPv6 localhost a IPv4 para consistencia
 */
export function normalizeIp(ip: string): string {
  // IPv6 localhost
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }
  
  // IPv4-mapped IPv6 address
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  
  return ip;
}

/**
 * Verifica si una IP está en la lista de autorizadas
 */
export function isIpAuthorized(ip: string, authorizedIps: string[]): boolean {
  const normalizedIp = normalizeIp(ip);
  
  return authorizedIps.some(authorizedIp => {
    const normalizedAuthorized = normalizeIp(authorizedIp.trim());
    
    // Coincidencia exacta
    if (normalizedIp === normalizedAuthorized) {
      return true;
    }
    
    // Soporte para rangos CIDR básicos (solo /24 y /16)
    if (authorizedIp.includes('/')) {
      const [baseIp, cidr] = authorizedIp.split('/');
      if (!baseIp || !cidr) return false;
      
      const cidrNum = parseInt(cidr, 10);
      
      if (cidrNum === 24) {
        // /24 - Comparar primeros 3 octetos
        const ipParts = normalizedIp.split('.');
        const baseParts = normalizeIp(baseIp).split('.');
        return ipParts.slice(0, 3).join('.') === baseParts.slice(0, 3).join('.');
      }
      
      if (cidrNum === 16) {
        // /16 - Comparar primeros 2 octetos
        const ipParts = normalizedIp.split('.');
        const baseParts = normalizeIp(baseIp).split('.');
        return ipParts.slice(0, 2).join('.') === baseParts.slice(0, 2).join('.');
      }
    }
    
    return false;
  });
}

/**
 * Middleware que verifica si la IP está autorizada
 * Usado para endpoints de sincronización del plugin de Minecraft
 */
export const ipWhitelistMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const clientIp = getClientIp(req);
    
    if (!isIpAuthorized(clientIp, env.AUTHORIZED_IPS)) {
      console.warn(`[IP WHITELIST] IP no autorizada: ${clientIp}`);
      throw Errors.ipNotAuthorized();
    }
    
    // Agregar IP al request para logging
    (req as any).clientIp = clientIp;
    
    next();
  }
);

/**
 * Middleware opcional que solo loguea la IP sin bloquear
 * Útil para debugging
 */
export function ipLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const clientIp = getClientIp(req);
  console.log(`[IP LOGGER] ${req.method} ${req.path} - IP: ${clientIp}`);
  (req as any).clientIp = clientIp;
  next();
}

/**
 * Crea un middleware de whitelist con IPs personalizadas
 */
export function createIpWhitelist(authorizedIps: string[]) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const clientIp = getClientIp(req);
    
    if (!isIpAuthorized(clientIp, authorizedIps)) {
      console.warn(`[IP WHITELIST] IP no autorizada: ${clientIp}`);
      throw Errors.ipNotAuthorized();
    }
    
    (req as any).clientIp = clientIp;
    next();
  });
}
