/**
 * Tipos para el Sistema de Mods
 * Cobblemon Los Pitufos - Backend API
 */

// ============================================
// TIPOS DE MOD
// ============================================

/**
 * Categoría del mod
 */
export type ModCategory = 'required' | 'optional' | 'resourcepack';

/**
 * Loader de mod compatible
 */
export type ModLoader = 'fabric' | 'forge' | 'both';

/**
 * Versión archivada de un mod
 */
export interface ArchivedModVersion {
  version: string;
  filename: string;
  uploadedAt: Date;
  checksum?: string;
}

/**
 * Interfaz principal de Mod
 */
export interface Mod {
  _id: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  category: ModCategory;
  
  // Información del archivo
  filename: string;
  originalSize: number; // bytes
  compressedSize: number; // bytes
  checksum: string; // SHA-256
  
  // Compatibilidad
  minecraftVersion: string;
  modLoader: ModLoader;
  
  // Metadatos opcionales
  author?: string;
  website?: string;
  changelog?: string;
  
  // Estado
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Historial de versiones
  previousVersions: ArchivedModVersion[];
}

/**
 * Mod para crear (sin campos auto-generados)
 */
export interface CreateModInput {
  name: string;
  slug?: string;
  version: string;
  description: string;
  category: ModCategory;
  minecraftVersion: string;
  modLoader: ModLoader;
  author?: string;
  website?: string;
  changelog?: string;
}

/**
 * Mod para actualizar
 */
export interface UpdateModInput {
  name?: string;
  version?: string;
  description?: string;
  category?: ModCategory;
  minecraftVersion?: string;
  modLoader?: ModLoader;
  author?: string;
  website?: string;
  changelog?: string;
}

// ============================================
// TIPOS DE RESPUESTA API
// ============================================

/**
 * Respuesta de lista de mods
 */
export interface ModListResponse {
  mods: Mod[];
  totalRequired: number;
  totalOptional: number;
  totalResourcePacks: number;
  packageVersion: string;
  packageSize: number;
}

/**
 * Respuesta de versiones de mods
 */
export interface ModVersionsResponse {
  versions: Record<string, string>; // modId -> version
  packageVersion: string;
}

/**
 * Información del paquete ZIP
 */
export interface PackageInfo {
  version: string;
  size: number;
  modCount: number;
  lastUpdated: Date;
  filename: string;
}

/**
 * Resultado de validación de archivo de mod
 */
export interface ModFileValidationResult {
  valid: boolean;
  error?: string;
  metadata?: {
    name?: string;
    version?: string;
    author?: string;
    description?: string;
  };
}

/**
 * Opciones para generación de ZIP
 */
export interface ZipGenerationOptions {
  compressionLevel: number; // 0-9, 9 = máxima compresión
  includeReadme: boolean;
  includedCategories: ModCategory[];
}

// ============================================
// TIPOS DE ALMACENAMIENTO
// ============================================

/**
 * Información de archivo almacenado
 */
export interface StoredFileInfo {
  path: string;
  originalSize: number;
  compressedSize: number;
  checksum: string;
  createdAt: Date;
}

/**
 * Resultado de operación de archivo
 */
export interface FileOperationResult {
  success: boolean;
  path?: string;
  error?: string;
  checksum?: string;
  originalSize?: number;
  compressedSize?: number;
}
