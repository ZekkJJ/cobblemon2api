/**
 * Servicio de Almacenamiento de Archivos para Mods
 * Cobblemon Los Pitufos - Backend API
 * 
 * Gestiona el almacenamiento comprimido de archivos de mods
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';
import { pipeline, Readable } from 'stream';
import { FileOperationResult, StoredFileInfo } from '../../shared/types/mod.types.js';

const pipelineAsync = promisify(pipeline);
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// Directorio base para almacenamiento de mods
const MODS_STORAGE_DIR = process.env.MODS_STORAGE_DIR || './mods-storage';
const ACTIVE_DIR = path.join(MODS_STORAGE_DIR, 'active');
const ARCHIVE_DIR = path.join(MODS_STORAGE_DIR, 'archive');
const PACKAGES_DIR = path.join(MODS_STORAGE_DIR, 'packages');

/**
 * Servicio de almacenamiento de archivos de mods
 */
export class FileStorageService {
  
  /**
   * Inicializa los directorios de almacenamiento
   */
  static async initialize(): Promise<void> {
    const dirs = [MODS_STORAGE_DIR, ACTIVE_DIR, ARCHIVE_DIR, PACKAGES_DIR];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
        console.log(`[FileStorage] Directorio creado: ${dir}`);
      }
    }
  }

  /**
   * Calcula el checksum SHA-256 de un buffer
   */
  static calculateChecksum(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Genera un slug seguro para el nombre del archivo
   */
  static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Guarda un archivo de mod con compresión gzip
   * @param modId ID único del mod
   * @param fileBuffer Buffer del archivo original
   * @param originalFilename Nombre original del archivo
   */
  static async saveModFile(
    modId: string,
    fileBuffer: Buffer,
    originalFilename: string
  ): Promise<FileOperationResult> {
    try {
      await this.initialize();
      
      // Calcular checksum del archivo original
      const checksum = this.calculateChecksum(fileBuffer);
      const originalSize = fileBuffer.length;
      
      // Comprimir con gzip nivel máximo
      const compressedBuffer = await gzip(fileBuffer, { level: 9 });
      const compressedSize = compressedBuffer.length;
      
      // Determinar extensión y nombre del archivo
      const ext = path.extname(originalFilename);
      const filename = `${modId}${ext}.gz`;
      const filePath = path.join(ACTIVE_DIR, filename);
      
      // Guardar archivo comprimido
      await fs.promises.writeFile(filePath, compressedBuffer);
      
      console.log(`[FileStorage] Mod guardado: ${filename} (${originalSize} -> ${compressedSize} bytes, ${((1 - compressedSize/originalSize) * 100).toFixed(1)}% compresión)`);
      
      return {
        success: true,
        path: filePath,
        checksum,
        originalSize,
        compressedSize,
      };
    } catch (error: any) {
      console.error('[FileStorage] Error guardando mod:', error);
      return {
        success: false,
        error: error.message || 'Error al guardar el archivo',
      };
    }
  }

  /**
   * Obtiene un archivo de mod descomprimido como stream
   * @param modId ID del mod
   * @param extension Extensión del archivo (.jar, .zip)
   */
  static async getModFileStream(
    modId: string,
    extension: string = '.jar'
  ): Promise<{ stream: Readable; size: number } | null> {
    try {
      const filename = `${modId}${extension}.gz`;
      const filePath = path.join(ACTIVE_DIR, filename);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`[FileStorage] Archivo no encontrado: ${filePath}`);
        return null;
      }
      
      // Leer archivo comprimido
      const compressedBuffer = await fs.promises.readFile(filePath);
      
      // Descomprimir
      const decompressedBuffer = await gunzip(compressedBuffer);
      
      // Crear stream desde buffer
      const stream = Readable.from(decompressedBuffer);
      
      return {
        stream,
        size: decompressedBuffer.length,
      };
    } catch (error: any) {
      console.error('[FileStorage] Error obteniendo mod:', error);
      return null;
    }
  }

  /**
   * Obtiene un archivo de mod descomprimido como buffer
   */
  static async getModFileBuffer(
    modId: string,
    extension: string = '.jar'
  ): Promise<Buffer | null> {
    try {
      const filename = `${modId}${extension}.gz`;
      const filePath = path.join(ACTIVE_DIR, filename);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const compressedBuffer = await fs.promises.readFile(filePath);
      return await gunzip(compressedBuffer);
    } catch (error: any) {
      console.error('[FileStorage] Error obteniendo buffer de mod:', error);
      return null;
    }
  }

  /**
   * Mueve un archivo de mod al archivo (para versiones antiguas)
   * @param modId ID del mod
   * @param version Versión del mod
   * @param extension Extensión del archivo
   */
  static async archiveModFile(
    modId: string,
    version: string,
    extension: string = '.jar'
  ): Promise<FileOperationResult> {
    try {
      const sourceFilename = `${modId}${extension}.gz`;
      const sourcePath = path.join(ACTIVE_DIR, sourceFilename);
      
      if (!fs.existsSync(sourcePath)) {
        return {
          success: false,
          error: 'Archivo no encontrado',
        };
      }
      
      const archiveFilename = `${modId}-v${version}${extension}.gz`;
      const archivePath = path.join(ARCHIVE_DIR, archiveFilename);
      
      // Copiar al archivo
      await fs.promises.copyFile(sourcePath, archivePath);
      
      console.log(`[FileStorage] Mod archivado: ${archiveFilename}`);
      
      return {
        success: true,
        path: archivePath,
      };
    } catch (error: any) {
      console.error('[FileStorage] Error archivando mod:', error);
      return {
        success: false,
        error: error.message || 'Error al archivar el archivo',
      };
    }
  }

  /**
   * Elimina un archivo de mod (mueve al archivo primero)
   */
  static async deleteModFile(
    modId: string,
    version: string,
    extension: string = '.jar'
  ): Promise<FileOperationResult> {
    try {
      // Primero archivar
      const archiveResult = await this.archiveModFile(modId, version, extension);
      
      if (!archiveResult.success) {
        // Si no existe el archivo, considerarlo como éxito
        if (archiveResult.error === 'Archivo no encontrado') {
          return { success: true };
        }
        return archiveResult;
      }
      
      // Luego eliminar del directorio activo
      const filename = `${modId}${extension}.gz`;
      const filePath = path.join(ACTIVE_DIR, filename);
      
      await fs.promises.unlink(filePath);
      
      console.log(`[FileStorage] Mod eliminado: ${filename}`);
      
      return { success: true };
    } catch (error: any) {
      console.error('[FileStorage] Error eliminando mod:', error);
      return {
        success: false,
        error: error.message || 'Error al eliminar el archivo',
      };
    }
  }

  /**
   * Verifica la integridad de un archivo de mod
   */
  static async verifyModFile(
    modId: string,
    expectedChecksum: string,
    extension: string = '.jar'
  ): Promise<boolean> {
    try {
      const buffer = await this.getModFileBuffer(modId, extension);
      
      if (!buffer) {
        return false;
      }
      
      const actualChecksum = this.calculateChecksum(buffer);
      return actualChecksum === expectedChecksum;
    } catch (error) {
      console.error('[FileStorage] Error verificando mod:', error);
      return false;
    }
  }

  /**
   * Obtiene información de un archivo almacenado
   */
  static async getFileInfo(
    modId: string,
    extension: string = '.jar'
  ): Promise<StoredFileInfo | null> {
    try {
      const filename = `${modId}${extension}.gz`;
      const filePath = path.join(ACTIVE_DIR, filename);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const stats = await fs.promises.stat(filePath);
      const compressedBuffer = await fs.promises.readFile(filePath);
      const decompressedBuffer = await gunzip(compressedBuffer);
      const checksum = this.calculateChecksum(decompressedBuffer);
      
      return {
        path: filePath,
        originalSize: decompressedBuffer.length,
        compressedSize: stats.size,
        checksum,
        createdAt: stats.birthtime,
      };
    } catch (error) {
      console.error('[FileStorage] Error obteniendo info de archivo:', error);
      return null;
    }
  }

  /**
   * Lista todos los archivos de mods activos
   */
  static async listActiveFiles(): Promise<string[]> {
    try {
      await this.initialize();
      const files = await fs.promises.readdir(ACTIVE_DIR);
      return files.filter(f => f.endsWith('.gz'));
    } catch (error) {
      console.error('[FileStorage] Error listando archivos:', error);
      return [];
    }
  }

  /**
   * Obtiene el directorio de paquetes
   */
  static getPackagesDir(): string {
    return PACKAGES_DIR;
  }

  /**
   * Obtiene el directorio activo
   */
  static getActiveDir(): string {
    return ACTIVE_DIR;
  }
}

export default FileStorageService;
