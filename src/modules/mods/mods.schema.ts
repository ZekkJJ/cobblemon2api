/**
 * Esquemas de Validación para Mods
 * Cobblemon Los Pitufos - Backend API
 * 
 * Define los esquemas Zod para validar datos de mods
 */

import { z } from 'zod';

/**
 * Categorías válidas de mod
 */
export const modCategorySchema = z.enum(['required', 'optional', 'resourcepack']);

/**
 * Loaders de mod válidos
 */
export const modLoaderSchema = z.enum(['fabric', 'forge', 'both']);

/**
 * Esquema para versión archivada
 */
export const archivedVersionSchema = z.object({
  version: z.string().min(1),
  filename: z.string().min(1),
  uploadedAt: z.date(),
  checksum: z.string().optional(),
});

/**
 * Esquema para crear un mod (upload)
 */
export const createModSchema = z.object({
  name: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  slug: z.string()
    .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones')
    .optional(),
  version: z.string()
    .min(1, 'La versión es requerida')
    .regex(/^\d+\.\d+(\.\d+)?(-[a-zA-Z0-9]+)?$/, 'Formato de versión inválido (ej: 1.0.0, 1.2.3-beta)'),
  description: z.string()
    .min(1, 'La descripción es requerida')
    .max(500, 'La descripción no puede exceder 500 caracteres'),
  category: modCategorySchema,
  minecraftVersion: z.string()
    .min(1, 'La versión de Minecraft es requerida')
    .regex(/^\d+\.\d+(\.\d+)?$/, 'Formato de versión de Minecraft inválido'),
  modLoader: modLoaderSchema,
  author: z.string().max(100).optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  changelog: z.string().max(2000, 'El changelog no puede exceder 2000 caracteres').optional(),
});

/**
 * Esquema para actualizar un mod
 */
export const updateModSchema = z.object({
  name: z.string()
    .min(1)
    .max(100)
    .optional(),
  version: z.string()
    .regex(/^\d+\.\d+(\.\d+)?(-[a-zA-Z0-9]+)?$/)
    .optional(),
  description: z.string()
    .min(1)
    .max(500)
    .optional(),
  category: modCategorySchema.optional(),
  minecraftVersion: z.string()
    .regex(/^\d+\.\d+(\.\d+)?$/)
    .optional(),
  modLoader: modLoaderSchema.optional(),
  author: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
  changelog: z.string().max(2000).optional(),
});

/**
 * Esquema para parámetros de ID de mod
 */
export const modIdParamSchema = z.object({
  id: z.string().min(1, 'ID de mod es requerido'),
});

/**
 * Esquema para filtros de búsqueda de mods
 */
export const modFiltersSchema = z.object({
  category: modCategorySchema.optional(),
  search: z.string().max(100).optional(),
  modLoader: modLoaderSchema.optional(),
  minecraftVersion: z.string().optional(),
  isActive: z.boolean().optional(),
});

/**
 * Esquema para opciones de generación de ZIP
 */
export const zipOptionsSchema = z.object({
  compressionLevel: z.number().int().min(0).max(9).default(9),
  includeReadme: z.boolean().default(true),
  includedCategories: z.array(modCategorySchema).default(['required']),
});

/**
 * Tipos inferidos de los esquemas
 */
export type ModCategory = z.infer<typeof modCategorySchema>;
export type ModLoader = z.infer<typeof modLoaderSchema>;
export type ArchivedVersionInput = z.infer<typeof archivedVersionSchema>;
export type CreateModInput = z.infer<typeof createModSchema>;
export type UpdateModInput = z.infer<typeof updateModSchema>;
export type ModIdParam = z.infer<typeof modIdParamSchema>;
export type ModFilters = z.infer<typeof modFiltersSchema>;
export type ZipOptions = z.infer<typeof zipOptionsSchema>;
