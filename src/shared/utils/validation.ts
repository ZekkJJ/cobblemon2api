/**
 * Utilidades de Validación
 * Cobblemon Los Pitufos - Backend API
 * 
 * Este módulo proporciona funciones de validación comunes
 * y helpers para trabajar con esquemas Zod.
 */

import { z, ZodSchema, ZodError } from 'zod';
import { Request } from 'express';
import { AppError, ErrorCode } from '../middleware/error-handler.js';

// ============================================
// TIPOS
// ============================================

/**
 * Resultado de validación
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  field?: string;
}

// ============================================
// FUNCIONES DE VALIDACIÓN
// ============================================

/**
 * Valida datos contra un esquema Zod
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const firstError = result.error.errors[0];
    return {
      success: false,
      error: firstError?.message || 'Error de validación',
      field: firstError?.path.join('.'),
    };
  }
  
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Valida datos y lanza AppError si falla
 */
export function validateOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const firstError = result.error.errors[0];
    throw new AppError(
      firstError?.message || 'Error de validación',
      400,
      ErrorCode.VALIDATION_ERROR,
      firstError?.path.join('.')
    );
  }
  
  return result.data;
}

/**
 * Valida el body de una request
 */
export function validateBody<T>(schema: ZodSchema<T>, req: Request): T {
  return validateOrThrow(schema, req.body);
}

/**
 * Valida los query params de una request
 */
export function validateQuery<T>(schema: ZodSchema<T>, req: Request): T {
  return validateOrThrow(schema, req.query);
}

/**
 * Valida los params de una request
 */
export function validateParams<T>(schema: ZodSchema<T>, req: Request): T {
  return validateOrThrow(schema, req.params);
}

// ============================================
// ESQUEMAS COMUNES
// ============================================

/**
 * Esquema para UUID de Minecraft
 */
export const MinecraftUuidSchema = z.string()
  .min(32, 'UUID debe tener al menos 32 caracteres')
  .max(36, 'UUID debe tener máximo 36 caracteres')
  .regex(/^[0-9a-f-]+$/i, 'UUID inválido');

/**
 * Esquema para Discord ID
 */
export const DiscordIdSchema = z.string()
  .min(17, 'Discord ID debe tener al menos 17 caracteres')
  .max(20, 'Discord ID debe tener máximo 20 caracteres')
  .regex(/^\d+$/, 'Discord ID debe ser numérico');

/**
 * Esquema para ObjectId de MongoDB
 */
export const ObjectIdSchema = z.string()
  .length(24, 'ID debe tener 24 caracteres')
  .regex(/^[0-9a-f]+$/i, 'ID inválido');

/**
 * Esquema para paginación
 */
export const PaginationSchema = z.object({
  page: z.string().optional().transform(val => {
    const num = parseInt(val || '1', 10);
    return isNaN(num) || num < 1 ? 1 : num;
  }),
  limit: z.string().optional().transform(val => {
    const num = parseInt(val || '20', 10);
    return isNaN(num) || num < 1 ? 20 : Math.min(num, 100);
  }),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Esquema para búsqueda
 */
export const SearchSchema = z.object({
  query: z.string().max(100).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

// ============================================
// VALIDADORES ESPECÍFICOS
// ============================================

/**
 * Valida un UUID de Minecraft
 */
export function isValidMinecraftUuid(uuid: string): boolean {
  return MinecraftUuidSchema.safeParse(uuid).success;
}

/**
 * Valida un Discord ID
 */
export function isValidDiscordId(id: string): boolean {
  return DiscordIdSchema.safeParse(id).success;
}

/**
 * Valida un ObjectId de MongoDB
 */
export function isValidObjectId(id: string): boolean {
  return ObjectIdSchema.safeParse(id).success;
}

/**
 * Valida un email
 */
export function isValidEmail(email: string): boolean {
  return z.string().email().safeParse(email).success;
}

/**
 * Valida una URL
 */
export function isValidUrl(url: string): boolean {
  return z.string().url().safeParse(url).success;
}

/**
 * Valida una fecha ISO
 */
export function isValidIsoDate(date: string): boolean {
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

/**
 * Valida que una fecha sea futura
 */
export function isFutureDate(date: string): boolean {
  const parsed = new Date(date);
  return !isNaN(parsed.getTime()) && parsed > new Date();
}

// ============================================
// SANITIZACIÓN
// ============================================

/**
 * Sanitiza una cadena de texto
 * Elimina caracteres potencialmente peligrosos
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Eliminar < y >
    .replace(/javascript:/gi, '') // Eliminar javascript:
    .replace(/on\w+=/gi, ''); // Eliminar event handlers
}

/**
 * Sanitiza un objeto recursivamente
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) :
        typeof item === 'object' && item !== null ? sanitizeObject(item as Record<string, unknown>) :
        item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

/**
 * Normaliza un UUID de Minecraft (con o sin guiones)
 */
export function normalizeMinecraftUuid(uuid: string): string {
  // Eliminar guiones si existen
  const clean = uuid.replace(/-/g, '').toLowerCase();
  
  // Si tiene 32 caracteres, agregar guiones en formato estándar
  if (clean.length === 32) {
    return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
  }
  
  return uuid.toLowerCase();
}

// ============================================
// HELPERS DE ERROR
// ============================================

/**
 * Formatea errores de Zod a mensaje legible
 */
export function formatZodErrors(error: ZodError): string[] {
  return error.errors.map(e => {
    const path = e.path.join('.');
    return path ? `${path}: ${e.message}` : e.message;
  });
}

/**
 * Crea un mensaje de error de validación
 */
export function createValidationError(field: string, message: string): AppError {
  return new AppError(message, 400, ErrorCode.VALIDATION_ERROR, field);
}
