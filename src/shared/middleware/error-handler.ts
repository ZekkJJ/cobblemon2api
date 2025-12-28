/**
 * Middleware de Manejo de Errores
 * Cobblemon Los Pitufos - Backend API
 * 
 * Este middleware captura todos los errores de la aplicación
 * y los formatea de manera consistente para el cliente.
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { isDevelopment } from '../../config/env.js';

/**
 * Códigos de error personalizados
 */
export enum ErrorCode {
  // Autenticación
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Autorización
  FORBIDDEN = 'FORBIDDEN',
  ADMIN_REQUIRED = 'ADMIN_REQUIRED',
  IP_NOT_AUTHORIZED = 'IP_NOT_AUTHORIZED',
  
  // Validación
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Recursos
  NOT_FOUND = 'NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  STARTER_NOT_FOUND = 'STARTER_NOT_FOUND',
  TOURNAMENT_NOT_FOUND = 'TOURNAMENT_NOT_FOUND',
  
  // Player Shop
  POKEMON_NOT_FOUND = 'POKEMON_NOT_FOUND',
  POKEMON_IN_ESCROW = 'POKEMON_IN_ESCROW',
  LISTING_NOT_FOUND = 'LISTING_NOT_FOUND',
  NOT_LISTING_OWNER = 'NOT_LISTING_OWNER',
  LISTING_NOT_ACTIVE = 'LISTING_NOT_ACTIVE',
  CANNOT_CANCEL_WITH_BIDS = 'CANNOT_CANCEL_WITH_BIDS',
  CANNOT_BUY_OWN_LISTING = 'CANNOT_BUY_OWN_LISTING',
  SELLER_NOT_FOUND = 'SELLER_NOT_FOUND',
  AUCTION_ENDED = 'AUCTION_ENDED',
  CANNOT_BID_OWN_LISTING = 'CANNOT_BID_OWN_LISTING',
  DELIVERY_NOT_FOUND = 'DELIVERY_NOT_FOUND',
  INVALID_PRICE = 'INVALID_PRICE',
  INVALID_STARTING_BID = 'INVALID_STARTING_BID',
  INVALID_DURATION = 'INVALID_DURATION',
  BID_TOO_LOW = 'BID_TOO_LOW',
  
  // Torneos
  REGISTRATION_CLOSED = 'REGISTRATION_CLOSED',
  TOURNAMENT_FULL = 'TOURNAMENT_FULL',
  ALREADY_REGISTERED = 'ALREADY_REGISTERED',
  VERSION_CONFLICT = 'VERSION_CONFLICT',
  
  // Gacha
  ALREADY_ROLLED = 'ALREADY_ROLLED',
  NO_STARTERS_AVAILABLE = 'NO_STARTERS_AVAILABLE',
  STARTER_ALREADY_CLAIMED = 'STARTER_ALREADY_CLAIMED',
  BANNER_NOT_FOUND = 'BANNER_NOT_FOUND',
  BANNER_EXPIRED = 'BANNER_EXPIRED',
  BANNER_NOT_STARTED = 'BANNER_NOT_STARTED',
  PLAYER_NOT_FOUND = 'PLAYER_NOT_FOUND',
  
  // Tienda
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  INVALID_QUANTITY = 'INVALID_QUANTITY',
  PURCHASE_NOT_FOUND = 'PURCHASE_NOT_FOUND',
  
  // Verificación
  INVALID_CODE = 'INVALID_CODE',
  CODE_EXPIRED = 'CODE_EXPIRED',
  ALREADY_VERIFIED = 'ALREADY_VERIFIED',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Servidor
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

/**
 * Clase de error personalizada de la aplicación
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode | string;
  public readonly isOperational: boolean;
  public readonly field?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCode | string = ErrorCode.INTERNAL_ERROR,
    field?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.field = field;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Errores predefinidos comunes
 */
export const Errors = {
  // Autenticación
  unauthorized: (message?: string) => new AppError(message || 'No autenticado', 401, ErrorCode.UNAUTHORIZED),
  invalidToken: () => new AppError('Token inválido', 401, ErrorCode.INVALID_TOKEN),
  tokenExpired: () => new AppError('Token expirado', 401, ErrorCode.TOKEN_EXPIRED),
  
  // Autorización
  forbidden: (message?: string) => new AppError(message || 'Acceso denegado', 403, ErrorCode.FORBIDDEN),
  adminRequired: () => new AppError('Se requieren permisos de administrador', 403, ErrorCode.ADMIN_REQUIRED),
  ipNotAuthorized: () => new AppError('IP no autorizada', 403, ErrorCode.IP_NOT_AUTHORIZED),
  
  // Recursos
  notFound: (resource: string) => new AppError(`${resource} no encontrado`, 404, ErrorCode.NOT_FOUND),
  userNotFound: () => new AppError('Usuario no encontrado', 404, ErrorCode.USER_NOT_FOUND),
  playerNotFound: () => new AppError('Jugador no encontrado', 404, ErrorCode.USER_NOT_FOUND),
  starterNotFound: () => new AppError('Starter no encontrado', 404, ErrorCode.STARTER_NOT_FOUND),
  tournamentNotFound: () => new AppError('Torneo no encontrado', 404, ErrorCode.TOURNAMENT_NOT_FOUND),
  
  // Gacha
  alreadyRolled: () => new AppError('Ya has hecho tu tirada', 400, ErrorCode.ALREADY_ROLLED),
  noStartersAvailable: () => new AppError('No hay starters disponibles', 400, ErrorCode.NO_STARTERS_AVAILABLE),
  starterAlreadyClaimed: () => new AppError('Este starter ya fue reclamado', 409, ErrorCode.STARTER_ALREADY_CLAIMED),
  
  // Tienda
  insufficientBalance: () => new AppError('Balance insuficiente', 400, ErrorCode.INSUFFICIENT_BALANCE),
  insufficientStock: () => new AppError('Stock insuficiente', 400, ErrorCode.INSUFFICIENT_STOCK),
  invalidQuantity: () => new AppError('Cantidad inválida', 400, ErrorCode.INVALID_QUANTITY),
  purchaseNotFound: () => new AppError('Compra no encontrada', 404, ErrorCode.PURCHASE_NOT_FOUND),
  
  // Verificación
  invalidCode: () => new AppError('Código de verificación inválido', 400, ErrorCode.INVALID_CODE),
  codeExpired: () => new AppError('Código de verificación expirado', 400, ErrorCode.CODE_EXPIRED),
  alreadyVerified: () => new AppError('La cuenta ya está verificada', 400, ErrorCode.ALREADY_VERIFIED),
  
  // Rate Limiting
  rateLimitExceeded: () => new AppError('Demasiadas solicitudes, intenta más tarde', 429, ErrorCode.RATE_LIMIT_EXCEEDED),
  
  // Validación
  validationError: (message: string, field?: string) => new AppError(message, 400, ErrorCode.VALIDATION_ERROR, field),
  badRequest: (message: string) => new AppError(message, 400, ErrorCode.INVALID_INPUT),
  
  // Servidor
  internal: (message: string = 'Error interno del servidor') => new AppError(message, 500, ErrorCode.INTERNAL_ERROR),
  database: () => new AppError('Error de base de datos', 500, ErrorCode.DATABASE_ERROR),
  databaseError: () => new AppError('Error de base de datos', 500, ErrorCode.DATABASE_ERROR),
  externalService: (service: string) => new AppError(`Error en servicio externo: ${service}`, 502, ErrorCode.EXTERNAL_SERVICE_ERROR),
};

/**
 * Interfaz de respuesta de error
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: ErrorCode | string;
  field?: string;
  stack?: string;
}

/**
 * Formatea un error de Zod a mensaje legible
 */
function formatZodError(error: ZodError): { message: string; field?: string } {
  const firstError = error.errors[0];
  if (!firstError) {
    return { message: 'Error de validación' };
  }
  
  const field = firstError.path.join('.');
  const message = `${field}: ${firstError.message}`;
  
  return { message, field };
}

/**
 * Middleware de manejo de errores
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log del error
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  // Error de Zod (validación)
  if (err instanceof ZodError) {
    const { message, field } = formatZodError(err);
    res.status(400).json({
      success: false,
      error: message,
      code: ErrorCode.VALIDATION_ERROR,
      field,
    } as ErrorResponse);
    return;
  }

  // Error de la aplicación
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: err.message,
      code: err.code,
    };

    if (err.field) {
      response.field = err.field;
    }

    // Solo incluir stack en desarrollo
    if (isDevelopment) {
      response.stack = err.stack;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Error de sintaxis JSON
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      error: 'JSON inválido en el cuerpo de la solicitud',
      code: ErrorCode.INVALID_INPUT,
    } as ErrorResponse);
    return;
  }

  // Error genérico (no exponer detalles en producción)
  const response: ErrorResponse = {
    success: false,
    error: isDevelopment ? err.message : 'Error interno del servidor',
    code: ErrorCode.INTERNAL_ERROR,
  };

  if (isDevelopment) {
    response.stack = err.stack;
  }

  res.status(500).json(response);
};

/**
 * Middleware para rutas no encontradas
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Ruta no encontrada: ${req.method} ${req.path}`,
    code: ErrorCode.NOT_FOUND,
  } as ErrorResponse);
}

/**
 * Wrapper para manejar errores async en controladores
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
