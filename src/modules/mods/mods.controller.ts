/**
 * Controlador de Mods
 * Cobblemon Los Pitufos - Backend API
 * 
 * Maneja las peticiones HTTP para el sistema de mods
 */

import { Request, Response } from 'express';
import { ModsService } from './mods.service.js';
import { FileStorageService } from './file-storage.service.js';
import { ZipGeneratorService } from './zip-generator.service.js';
import { createModSchema, updateModSchema } from './mods.schema.js';
import { ZodError } from 'zod';

/**
 * Controlador de mods
 */
export class ModsController {
  private modsService: ModsService;

  constructor(modsService: ModsService) {
    this.modsService = modsService;
  }

  /**
   * GET /api/mods
   * Obtiene la lista de todos los mods activos
   */
  getAllMods = async (req: Request, res: Response): Promise<void> => {
    try {
      const response = await this.modsService.getModListResponse();
      res.json(response);
    } catch (error: any) {
      console.error('[ModsController] Error obteniendo mods:', error);
      res.status(500).json({
        error: 'Error al obtener la lista de mods',
        code: 'MODS_FETCH_ERROR',
      });
    }
  };

  /**
   * GET /api/mods/versions
   * Obtiene las versiones de todos los mods
   */
  getModVersions = async (req: Request, res: Response): Promise<void> => {
    try {
      const versions = await this.modsService.getModVersions();
      res.json(versions);
    } catch (error: any) {
      console.error('[ModsController] Error obteniendo versiones:', error);
      res.status(500).json({
        error: 'Error al obtener versiones',
        code: 'VERSIONS_FETCH_ERROR',
      });
    }
  };

  /**
   * GET /api/mods/:id
   * Obtiene un mod por ID
   */
  getModById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const mod = await this.modsService.getModById(id);

      if (!mod) {
        res.status(404).json({
          error: 'Mod no encontrado',
          code: 'MOD_NOT_FOUND',
        });
        return;
      }

      res.json(mod);
    } catch (error: any) {
      console.error('[ModsController] Error obteniendo mod:', error);
      res.status(500).json({
        error: 'Error al obtener el mod',
        code: 'MOD_FETCH_ERROR',
      });
    }
  };

  /**
   * GET /api/mods/:id/download
   * Descarga un mod individual
   */
  downloadMod = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const mod = await this.modsService.getModById(id);

      if (!mod) {
        res.status(404).json({
          error: 'Mod no encontrado',
          code: 'MOD_NOT_FOUND',
        });
        return;
      }

      const extension = mod.category === 'resourcepack' ? '.zip' : '.jar';
      const fileData = await FileStorageService.getModFileStream(id, extension);

      if (!fileData) {
        res.status(404).json({
          error: 'Archivo no disponible',
          code: 'FILE_NOT_FOUND',
        });
        return;
      }

      // Configurar headers para descarga
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${mod.filename}"`);
      res.setHeader('Content-Length', fileData.size);
      res.setHeader('X-Mod-Version', mod.version);
      res.setHeader('X-Mod-Checksum', mod.checksum);

      // Stream del archivo
      fileData.stream.pipe(res);
    } catch (error: any) {
      console.error('[ModsController] Error descargando mod:', error);
      res.status(500).json({
        error: 'Error al descargar el mod',
        code: 'DOWNLOAD_ERROR',
      });
    }
  };

  /**
   * GET /api/mods/package
   * Descarga el paquete ZIP con todos los mods requeridos
   */
  downloadPackage = async (req: Request, res: Response): Promise<void> => {
    try {
      const version = this.modsService.getPackageVersion();
      
      // Verificar si el paquete existe, si no, generarlo
      let packageInfo = await ZipGeneratorService.getPackageInfo(version);
      
      if (!packageInfo) {
        console.log('[ModsController] Generando paquete de mods...');
        const result = await this.modsService.generateModsPackage();
        
        if (!result.success) {
          res.status(500).json({
            error: result.error || 'Error al generar el paquete',
            code: 'PACKAGE_GENERATION_ERROR',
          });
          return;
        }
        
        packageInfo = await ZipGeneratorService.getPackageInfo(version);
      }

      if (!packageInfo) {
        res.status(404).json({
          error: 'Paquete no disponible',
          code: 'PACKAGE_NOT_FOUND',
        });
        return;
      }

      const stream = ZipGeneratorService.getPackageStream(version);

      if (!stream) {
        res.status(404).json({
          error: 'Archivo de paquete no encontrado',
          code: 'PACKAGE_FILE_NOT_FOUND',
        });
        return;
      }

      // Configurar headers para descarga
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${packageInfo.filename}"`);
      res.setHeader('Content-Length', packageInfo.size);
      res.setHeader('X-Package-Version', version);

      // Stream del archivo
      stream.pipe(res);
    } catch (error: any) {
      console.error('[ModsController] Error descargando paquete:', error);
      res.status(500).json({
        error: 'Error al descargar el paquete',
        code: 'PACKAGE_DOWNLOAD_ERROR',
      });
    }
  };

  /**
   * GET /api/mods/package/info
   * Obtiene información del paquete sin descargarlo
   */
  getPackageInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const version = this.modsService.getPackageVersion();
      const packageInfo = await ZipGeneratorService.getPackageInfo(version);

      res.json({
        version,
        available: !!packageInfo,
        size: packageInfo?.size || 0,
        filename: packageInfo?.filename || `LosPitufos-Mods-v${version}.zip`,
        lastUpdated: packageInfo?.lastUpdated || null,
      });
    } catch (error: any) {
      console.error('[ModsController] Error obteniendo info del paquete:', error);
      res.status(500).json({
        error: 'Error al obtener información del paquete',
        code: 'PACKAGE_INFO_ERROR',
      });
    }
  };

  /**
   * POST /api/mods
   * Crea un nuevo mod (admin)
   */
  createMod = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validar datos
      const validatedData = createModSchema.parse(req.body);

      // Verificar que hay archivo
      if (!req.file) {
        res.status(400).json({
          error: 'Archivo de mod requerido',
          code: 'FILE_REQUIRED',
        });
        return;
      }

      const result = await this.modsService.createMod(
        validatedData,
        req.file.buffer,
        req.file.originalname
      );

      if (!result.success) {
        res.status(400).json({
          error: result.error,
          code: 'MOD_CREATE_ERROR',
        });
        return;
      }

      res.status(201).json({
        success: true,
        mod: result.mod,
        message: 'Mod creado exitosamente',
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Datos de mod inválidos',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        });
        return;
      }

      console.error('[ModsController] Error creando mod:', error);
      res.status(500).json({
        error: 'Error al crear el mod',
        code: 'MOD_CREATE_ERROR',
      });
    }
  };

  /**
   * PUT /api/mods/:id
   * Actualiza un mod existente (admin)
   */
  updateMod = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const validatedData = updateModSchema.parse(req.body);

      const result = await this.modsService.updateMod(
        id,
        validatedData,
        req.file?.buffer,
        req.file?.originalname
      );

      if (!result.success) {
        res.status(400).json({
          error: result.error,
          code: 'MOD_UPDATE_ERROR',
        });
        return;
      }

      res.json({
        success: true,
        mod: result.mod,
        message: 'Mod actualizado exitosamente',
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Datos de mod inválidos',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        });
        return;
      }

      console.error('[ModsController] Error actualizando mod:', error);
      res.status(500).json({
        error: 'Error al actualizar el mod',
        code: 'MOD_UPDATE_ERROR',
      });
    }
  };

  /**
   * DELETE /api/mods/:id
   * Elimina un mod (soft delete) (admin)
   */
  deleteMod = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.modsService.deleteMod(id);

      if (!result.success) {
        res.status(400).json({
          error: result.error,
          code: 'MOD_DELETE_ERROR',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Mod eliminado exitosamente',
      });
    } catch (error: any) {
      console.error('[ModsController] Error eliminando mod:', error);
      res.status(500).json({
        error: 'Error al eliminar el mod',
        code: 'MOD_DELETE_ERROR',
      });
    }
  };

  /**
   * POST /api/mods/:id/reactivate
   * Reactiva un mod eliminado (admin)
   */
  reactivateMod = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.modsService.reactivateMod(id);

      if (!result.success) {
        res.status(400).json({
          error: result.error,
          code: 'MOD_REACTIVATE_ERROR',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Mod reactivado exitosamente',
      });
    } catch (error: any) {
      console.error('[ModsController] Error reactivando mod:', error);
      res.status(500).json({
        error: 'Error al reactivar el mod',
        code: 'MOD_REACTIVATE_ERROR',
      });
    }
  };

  /**
   * GET /api/mods/search
   * Busca mods por texto
   */
  searchMods = async (req: Request, res: Response): Promise<void> => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        res.status(400).json({
          error: 'Parámetro de búsqueda requerido',
          code: 'SEARCH_PARAM_REQUIRED',
        });
        return;
      }

      const mods = await this.modsService.searchMods(q);
      res.json({ mods });
    } catch (error: any) {
      console.error('[ModsController] Error buscando mods:', error);
      res.status(500).json({
        error: 'Error al buscar mods',
        code: 'SEARCH_ERROR',
      });
    }
  };

  /**
   * POST /api/mods/regenerate-package
   * Regenera el paquete ZIP (admin)
   */
  regeneratePackage = async (req: Request, res: Response): Promise<void> => {
    try {
      ZipGeneratorService.invalidateCache();
      const result = await this.modsService.generateModsPackage();

      if (!result.success) {
        res.status(500).json({
          error: result.error,
          code: 'PACKAGE_REGENERATE_ERROR',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Paquete regenerado exitosamente',
        size: result.size,
      });
    } catch (error: any) {
      console.error('[ModsController] Error regenerando paquete:', error);
      res.status(500).json({
        error: 'Error al regenerar el paquete',
        code: 'PACKAGE_REGENERATE_ERROR',
      });
    }
  };
}

export default ModsController;
