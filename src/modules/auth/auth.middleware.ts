/**
 * Middleware de Autenticación
 * Cobblemon Los Pitufos - Backend API
 * 
 * Protege rutas que requieren autenticación
 */

import { Request, Response, NextFunction } from 'express';
import { verifyJWT, extractTokenFromHeader, JWTPayload } from '../../config/auth.js';
import { Errors } from '../../shared/middleware/error-handler.js';

/**
 * Extiende Request para incluir información del usuario
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Middleware que requiere autenticación
 * Verifica el JWT y agrega req.user
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    // Intentar obtener token de cookie o header
    let token = req.cookies?.['auth_token'];
    
    if (!token) {
      token = extractTokenFromHeader(req.headers.authorization);
    }

    if (!token) {
      throw Errors.unauthorized();
    }

    // Verificar y decodificar token
    const payload = verifyJWT(token);
    
    // Agregar usuario a request
    req.user = payload;
    
    next();
  } catch (error) {
    if (error instanceof Error && error.message.includes('expirado')) {
      next(Errors.tokenExpired());
    } else if (error instanceof Error && error.message.includes('inválido')) {
      next(Errors.invalidToken());
    } else {
      next(Errors.unauthorized());
    }
  }
}

/**
 * Middleware que requiere permisos de administrador
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  try {
    if (!req.user) {
      throw Errors.unauthorized();
    }

    if (!req.user.isAdmin) {
      throw Errors.adminRequired();
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware opcional de autenticación
 * No falla si no hay token, solo agrega req.user si existe
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    // Intentar obtener token
    let token = req.cookies?.['auth_token'];
    
    if (!token) {
      token = extractTokenFromHeader(req.headers.authorization);
    }

    if (token) {
      const payload = verifyJWT(token);
      req.user = payload;
    }
    
    next();
  } catch (error) {
    // Ignorar errores de token en auth opcional
    next();
  }
}
