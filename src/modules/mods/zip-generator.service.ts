/**
 * Servicio de Generación de ZIP para Mods
 * Cobblemon Los Pitufos - Backend API
 * 
 * Genera paquetes ZIP optimizados con todos los mods requeridos
 */

import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { Mod, PackageInfo, ZipGenerationOptions, ModCategory } from '../../shared/types/mod.types.js';
import { FileStorageService } from './file-storage.service.js';

// Directorio de paquetes
const PACKAGES_DIR = FileStorageService.getPackagesDir();

// Cache de información del paquete
let packageCache: {
  version: string;
  lastUpdated: Date;
  modIds: string[];
} | null = null;

/**
 * Servicio de generación de paquetes ZIP
 */
export class ZipGeneratorService {
  
  /**
   * Genera el nombre del archivo ZIP
   */
  static generatePackageFilename(version: string): string {
    return `LosPitufos-Mods-v${version}.zip`;
  }

  /**
   * Obtiene la ruta del paquete actual
   */
  static getPackagePath(version: string): string {
    return path.join(PACKAGES_DIR, this.generatePackageFilename(version));
  }

  /**
   * Verifica si el cache del paquete es válido
   */
  static isCacheValid(currentMods: Mod[]): boolean {
    if (!packageCache) return false;
    
    // Verificar que los IDs de mods coincidan
    const currentIds = currentMods
      .filter(m => m.isActive && m.category === 'required')
      .map(m => m._id)
      .sort();
    
    const cachedIds = [...packageCache.modIds].sort();
    
    if (currentIds.length !== cachedIds.length) return false;
    
    for (let i = 0; i < currentIds.length; i++) {
      if (currentIds[i] !== cachedIds[i]) return false;
    }
    
    // Verificar que el archivo existe
    const packagePath = this.getPackagePath(packageCache.version);
    return fs.existsSync(packagePath);
  }

  /**
   * Invalida el cache del paquete
   */
  static invalidateCache(): void {
    console.log('[ZipGenerator] Cache invalidado');
    packageCache = null;
  }

  /**
   * Genera un paquete ZIP con los mods especificados
   * @param mods Lista de mods a incluir
   * @param version Versión del paquete
   * @param options Opciones de generación
   */
  static async generatePackage(
    mods: Mod[],
    version: string,
    options: ZipGenerationOptions = {
      compressionLevel: 9,
      includeReadme: true,
      includedCategories: ['required'],
    }
  ): Promise<{ success: boolean; path?: string; size?: number; error?: string }> {
    try {
      await FileStorageService.initialize();
      
      // Filtrar mods por categorías incluidas
      const modsToInclude = mods.filter(
        m => m.isActive && options.includedCategories.includes(m.category)
      );
      
      if (modsToInclude.length === 0) {
        return {
          success: false,
          error: 'No hay mods para incluir en el paquete',
        };
      }
      
      const packagePath = this.getPackagePath(version);
      
      // Crear directorio si no existe
      if (!fs.existsSync(PACKAGES_DIR)) {
        await fs.promises.mkdir(PACKAGES_DIR, { recursive: true });
      }
      
      // Crear archivo ZIP
      const output = fs.createWriteStream(packagePath);
      const archive = archiver('zip', {
        zlib: { level: options.compressionLevel },
      });
      
      // Promesa para esperar a que termine
      const archivePromise = new Promise<void>((resolve, reject) => {
        output.on('close', resolve);
        archive.on('error', reject);
      });
      
      archive.pipe(output);
      
      // Agregar README si está habilitado
      if (options.includeReadme) {
        const readme = this.generateReadme(modsToInclude, version);
        archive.append(readme, { name: 'LEEME.txt' });
      }
      
      // Agregar cada mod al ZIP
      for (const mod of modsToInclude) {
        const extension = mod.category === 'resourcepack' ? '.zip' : '.jar';
        const buffer = await FileStorageService.getModFileBuffer(mod._id, extension);
        
        if (buffer) {
          archive.append(buffer, { name: mod.filename });
          console.log(`[ZipGenerator] Agregado: ${mod.filename}`);
        } else {
          console.warn(`[ZipGenerator] Archivo no encontrado para mod: ${mod.name}`);
        }
      }
      
      // Finalizar archivo
      await archive.finalize();
      await archivePromise;
      
      // Obtener tamaño del archivo
      const stats = await fs.promises.stat(packagePath);
      
      // Actualizar cache
      packageCache = {
        version,
        lastUpdated: new Date(),
        modIds: modsToInclude.map(m => m._id),
      };
      
      console.log(`[ZipGenerator] Paquete generado: ${packagePath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      
      return {
        success: true,
        path: packagePath,
        size: stats.size,
      };
    } catch (error: any) {
      console.error('[ZipGenerator] Error generando paquete:', error);
      return {
        success: false,
        error: error.message || 'Error al generar el paquete',
      };
    }
  }

  /**
   * Obtiene información del paquete actual
   */
  static async getPackageInfo(version: string): Promise<PackageInfo | null> {
    try {
      const packagePath = this.getPackagePath(version);
      
      if (!fs.existsSync(packagePath)) {
        return null;
      }
      
      const stats = await fs.promises.stat(packagePath);
      
      return {
        version,
        size: stats.size,
        modCount: packageCache?.modIds.length || 0,
        lastUpdated: stats.mtime,
        filename: this.generatePackageFilename(version),
      };
    } catch (error) {
      console.error('[ZipGenerator] Error obteniendo info del paquete:', error);
      return null;
    }
  }

  /**
   * Obtiene el stream del paquete para descarga
   */
  static getPackageStream(version: string): fs.ReadStream | null {
    const packagePath = this.getPackagePath(version);
    
    if (!fs.existsSync(packagePath)) {
      return null;
    }
    
    return fs.createReadStream(packagePath);
  }

  /**
   * Elimina paquetes antiguos
   */
  static async cleanOldPackages(keepVersions: string[] = []): Promise<void> {
    try {
      const files = await fs.promises.readdir(PACKAGES_DIR);
      
      for (const file of files) {
        if (!file.endsWith('.zip')) continue;
        
        // Extraer versión del nombre del archivo
        const match = file.match(/LosPitufos-Mods-v(.+)\.zip/);
        if (!match) continue;
        
        const version = match[1];
        
        if (!keepVersions.includes(version)) {
          const filePath = path.join(PACKAGES_DIR, file);
          await fs.promises.unlink(filePath);
          console.log(`[ZipGenerator] Paquete antiguo eliminado: ${file}`);
        }
      }
    } catch (error) {
      console.error('[ZipGenerator] Error limpiando paquetes antiguos:', error);
    }
  }

  /**
   * Genera el contenido del README
   */
  private static generateReadme(mods: Mod[], version: string): string {
    const date = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    let readme = `
╔══════════════════════════════════════════════════════════════╗
║           COBBLEMON LOS PITUFOS - PACK DE MODS               ║
║                      Versión ${version.padEnd(10)}                       ║
╚══════════════════════════════════════════════════════════════╝

Fecha de generación: ${date}
Total de mods: ${mods.length}

═══════════════════════════════════════════════════════════════
                    INSTRUCCIONES DE INSTALACIÓN
═══════════════════════════════════════════════════════════════

1. Cierra Minecraft si está abierto

2. Localiza tu carpeta de mods:
   • Windows: %appdata%\\.minecraft\\mods
   • Mac: ~/Library/Application Support/minecraft/mods
   • Linux: ~/.minecraft/mods

3. Copia TODOS los archivos .jar de este ZIP a la carpeta mods

4. Inicia Minecraft con Fabric ${mods[0]?.minecraftVersion || '1.20.1'}

═══════════════════════════════════════════════════════════════
                      MODS INCLUIDOS
═══════════════════════════════════════════════════════════════

`;

    for (const mod of mods) {
      readme += `• ${mod.name} v${mod.version}\n`;
      readme += `  ${mod.description}\n`;
      if (mod.author) readme += `  Autor: ${mod.author}\n`;
      readme += '\n';
    }

    readme += `
═══════════════════════════════════════════════════════════════
                         SOPORTE
═══════════════════════════════════════════════════════════════

Discord: https://discord.gg/lospitufos
Web: https://cobblemon.lospitufos.com

¡Disfruta jugando en Los Pitufos!
`;

    return readme;
  }
}

export default ZipGeneratorService;
