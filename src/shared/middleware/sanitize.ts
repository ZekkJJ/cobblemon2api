/**
 * Middleware de Sanitización
 * Cobblemon Los Pitufos - Backend API
 * 
 * Sanitiza automáticamente todos los inputs de las requests
 * para prevenir ataques de inyección
 */

import { Request, Response, NextFunction } from 'express';
import { sanitizeObject } from '../utils/validation.js';

/**
 * Middleware que sanitiza body, query y params de todas las requests
 */
export function sanitizeMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // Sanitizar body si existe
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitizar query params si existen
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query as Record<string, unknown>) as typeof req.query;
    }

    // Sanitizar params si existen
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    // Si hay error en sanitización, continuar sin sanitizar
    // (mejor que bloquear la request)
    console.error('[SANITIZE] Error sanitizing request:', error);
    next();
  }
}
