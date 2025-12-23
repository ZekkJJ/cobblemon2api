/**
 * Exportaciones de Tipos
 * Cobblemon Los Pitufos - Backend API
 */

export * from './user.types.js';
export * from './pokemon.types.js';
export * from './shop.types.js';
export * from './tournament.types.js';
export * from './level-caps.types.js';
export * from './mod.types.js';

// ============================================
// TIPOS COMUNES DE API
// ============================================

/**
 * Respuesta exitosa genérica
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * Respuesta de error genérica
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  field?: string;
}

/**
 * Respuesta de API genérica
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Parámetros de paginación
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Respuesta paginada
 */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Filtros de búsqueda genéricos
 */
export interface SearchFilters {
  query?: string;
  from?: string;
  to?: string;
}
