/**
 * Servicio de Mods
 * Cobblemon Los Pitufos - Backend API
 * 
 * Gestiona la lógica de negocio para mods del servidor
 */

import { Collection, Db, ObjectId } from 'mongodb';
import { Mod, ModListResponse, ModVersionsResponse, CreateModInput, UpdateModInput } from '../../shared/types/mod.types.js';
import { FileStorageService } from './file-storage.service.js';
import { ZipGeneratorService } from './zip-generator.service.js';

// Versión global del paquete (se incrementa con cada cambio)
let globalPackageVersion = '1.0.0';

/**
 * Servicio de gestión de mods
 */
export class ModsService {
  private collection: Collection<Mod>;
  
  constructor(db: Db) {
    this.collection = db.collection<Mod>('mods');
    this.initializeIndexes();
  }

  /**
   * Inicializa índices de la colección
   */
  private async initializeIndexes(): Promise<void> {
    try {
      await this.collection.createIndex({ slug: 1 }, { unique: true });
      await this.collection.createIndex({ category: 1 });
      await this.collection.createIndex({ isActive: 1 });
      await this.collection.createIndex({ name: 'text', description: 'text' });
      console.log('[ModsService] Índices inicializados');
    } catch (error) {
      console.error('[ModsService] Error inicializando índices:', error);
    }
  }

  /**
   * Genera un slug único para el mod
   */
  private async generateUniqueSlug(name: string, existingSlug?: string): Promise<string> {
    let baseSlug = existingSlug || FileStorageService.generateSlug(name);
    let slug = baseSlug;
    let counter = 1;
    
    while (await this.collection.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    return slug;
  }

  /**
   * Incrementa la versión del paquete global
   */
  private incrementPackageVersion(): void {
    const parts = globalPackageVersion.split('.').map(Number);
    parts[2]++; // Incrementar patch
    if (parts[2] >= 100) {
      parts[2] = 0;
      parts[1]++;
    }
    if (parts[1] >= 100) {
      parts[1] = 0;
      parts[0]++;
    }
    globalPackageVersion = parts.join('.');
    
    // Invalidar cache del ZIP
    ZipGeneratorService.invalidateCache();
    
    console.log(`[ModsService] Nueva versión del paquete: ${globalPackageVersion}`);
  }

  /**
   * Obtiene todos los mods activos
   */
  async getAllMods(includeInactive: boolean = false): Promise<Mod[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return this.collection.find(filter).sort({ category: 1, name: 1 }).toArray();
  }

  /**
   * Obtiene la respuesta completa de lista de mods
   */
  async getModListResponse(): Promise<ModListResponse> {
    const mods = await this.getAllMods();
    
    const totalRequired = mods.filter(m => m.category === 'required').length;
    const totalOptional = mods.filter(m => m.category === 'optional').length;
    const totalResourcePacks = mods.filter(m => m.category === 'resourcepack').length;
    
    // Calcular tamaño del paquete
    const packageInfo = await ZipGeneratorService.getPackageInfo(globalPackageVersion);
    const packageSize = packageInfo?.size || 0;
    
    return {
      mods,
      totalRequired,
      totalOptional,
      totalResourcePacks,
      packageVersion: globalPackageVersion,
      packageSize,
    };
  }

  /**
   * Obtiene un mod por ID
   */
  async getModById(id: string): Promise<Mod | null> {
    try {
      return this.collection.findOne({ _id: new ObjectId(id) as any });
    } catch (error) {
      return null;
    }
  }

  /**
   * Obtiene un mod por slug
   */
  async getModBySlug(slug: string): Promise<Mod | null> {
    return this.collection.findOne({ slug });
  }

  /**
   * Crea un nuevo mod
   */
  async createMod(
    input: CreateModInput,
    fileBuffer: Buffer,
    originalFilename: string
  ): Promise<{ success: boolean; mod?: Mod; error?: string }> {
    try {
      // Generar slug único
      const slug = await this.generateUniqueSlug(input.name, input.slug);
      
      // Crear documento del mod
      const modId = new ObjectId();
      const extension = input.category === 'resourcepack' ? '.zip' : '.jar';
      
      // Guardar archivo
      const fileResult = await FileStorageService.saveModFile(
        modId.toString(),
        fileBuffer,
        originalFilename
      );
      
      if (!fileResult.success) {
        return { success: false, error: fileResult.error };
      }
      
      const now = new Date();
      const mod: Mod = {
        _id: modId.toString(),
        name: input.name,
        slug,
        version: input.version,
        description: input.description,
        category: input.category,
        filename: originalFilename,
        originalSize: fileResult.originalSize!,
        compressedSize: fileResult.compressedSize!,
        checksum: fileResult.checksum!,
        minecraftVersion: input.minecraftVersion,
        modLoader: input.modLoader,
        author: input.author,
        website: input.website,
        changelog: input.changelog,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        previousVersions: [],
      };
      
      await this.collection.insertOne(mod as any);
      
      // Incrementar versión del paquete
      this.incrementPackageVersion();
      
      console.log(`[ModsService] Mod creado: ${mod.name} v${mod.version}`);
      
      return { success: true, mod };
    } catch (error: any) {
      console.error('[ModsService] Error creando mod:', error);
      return { success: false, error: error.message || 'Error al crear el mod' };
    }
  }

  /**
   * Actualiza un mod existente
   */
  async updateMod(
    id: string,
    input: UpdateModInput,
    fileBuffer?: Buffer,
    originalFilename?: string
  ): Promise<{ success: boolean; mod?: Mod; error?: string }> {
    try {
      const existingMod = await this.getModById(id);
      
      if (!existingMod) {
        return { success: false, error: 'Mod no encontrado' };
      }
      
      const updateData: Partial<Mod> = {
        ...input,
        updatedAt: new Date(),
      };
      
      // Si hay nuevo archivo, archivar el anterior y guardar el nuevo
      if (fileBuffer && originalFilename) {
        // Archivar versión anterior
        const extension = existingMod.category === 'resourcepack' ? '.zip' : '.jar';
        await FileStorageService.archiveModFile(id, existingMod.version, extension);
        
        // Guardar nueva versión
        const fileResult = await FileStorageService.saveModFile(
          id,
          fileBuffer,
          originalFilename
        );
        
        if (!fileResult.success) {
          return { success: false, error: fileResult.error };
        }
        
        // Agregar versión anterior al historial
        updateData.previousVersions = [
          ...(existingMod.previousVersions || []),
          {
            version: existingMod.version,
            filename: existingMod.filename,
            uploadedAt: existingMod.updatedAt,
            checksum: existingMod.checksum,
          },
        ];
        
        updateData.filename = originalFilename;
        updateData.originalSize = fileResult.originalSize;
        updateData.compressedSize = fileResult.compressedSize;
        updateData.checksum = fileResult.checksum;
      }
      
      await this.collection.updateOne(
        { _id: new ObjectId(id) as any },
        { $set: updateData }
      );
      
      // Incrementar versión del paquete
      this.incrementPackageVersion();
      
      const updatedMod = await this.getModById(id);
      
      console.log(`[ModsService] Mod actualizado: ${updatedMod?.name}`);
      
      return { success: true, mod: updatedMod! };
    } catch (error: any) {
      console.error('[ModsService] Error actualizando mod:', error);
      return { success: false, error: error.message || 'Error al actualizar el mod' };
    }
  }

  /**
   * Elimina un mod (soft delete)
   */
  async deleteMod(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const mod = await this.getModById(id);
      
      if (!mod) {
        return { success: false, error: 'Mod no encontrado' };
      }
      
      // Soft delete - marcar como inactivo
      await this.collection.updateOne(
        { _id: new ObjectId(id) as any },
        { 
          $set: { 
            isActive: false,
            updatedAt: new Date(),
          } 
        }
      );
      
      // Incrementar versión del paquete
      this.incrementPackageVersion();
      
      console.log(`[ModsService] Mod desactivado: ${mod.name}`);
      
      return { success: true };
    } catch (error: any) {
      console.error('[ModsService] Error eliminando mod:', error);
      return { success: false, error: error.message || 'Error al eliminar el mod' };
    }
  }

  /**
   * Reactiva un mod eliminado
   */
  async reactivateMod(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.collection.updateOne(
        { _id: new ObjectId(id) as any },
        { 
          $set: { 
            isActive: true,
            updatedAt: new Date(),
          } 
        }
      );
      
      this.incrementPackageVersion();
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene las versiones de todos los mods
   */
  async getModVersions(): Promise<ModVersionsResponse> {
    const mods = await this.getAllMods();
    
    const versions: Record<string, string> = {};
    for (const mod of mods) {
      versions[mod._id] = mod.version;
    }
    
    return {
      versions,
      packageVersion: globalPackageVersion,
    };
  }

  /**
   * Busca mods por texto
   */
  async searchMods(query: string): Promise<Mod[]> {
    return this.collection
      .find({
        isActive: true,
        $text: { $search: query },
      })
      .sort({ score: { $meta: 'textScore' } })
      .toArray();
  }

  /**
   * Obtiene mods por categoría
   */
  async getModsByCategory(category: string): Promise<Mod[]> {
    return this.collection
      .find({ category, isActive: true })
      .sort({ name: 1 })
      .toArray();
  }

  /**
   * Obtiene la versión actual del paquete
   */
  getPackageVersion(): string {
    return globalPackageVersion;
  }

  /**
   * Genera el paquete ZIP de mods requeridos
   */
  async generateModsPackage(): Promise<{ success: boolean; path?: string; size?: number; error?: string }> {
    const mods = await this.getAllMods();
    return ZipGeneratorService.generatePackage(mods, globalPackageVersion);
  }
}

export default ModsService;
