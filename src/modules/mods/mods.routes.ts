/**
 * Rutas de Mods - Cobblemon Los Pitufos Backend API
 * 
 * Endpoints para gestión y descarga de mods del servidor
 */

import { Router } from 'express';
import multer from 'multer';
import { ModsController } from './mods.controller.js';
import { ModsService } from './mods.service.js';
import { connectToDatabase } from '../../config/database.js';
import { createRateLimiter } from '../../shared/utils/rate-limiter.js';
import { requireAdmin as adminAuthMiddleware } from '../../modules/auth/auth.middleware.js';

// Configuración de multer para uploads de mods
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Permitir .jar y .zip
    const allowedExtensions = ['.jar', '.zip'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .jar y .zip'));
    }
  },
});

/**
 * Crea el router de mods
 */
export async function createModsRouter(): Promise<Router> {
  const router = Router();

  // Conectar a la base de datos
  const { db } = await connectToDatabase();
  
  // Crear servicio y controlador
  const modsService = new ModsService(db);
  const modsController = new ModsController(modsService);

  // Rate limiters
  const readLimiter = createRateLimiter({
    windowMs: 60000, // 1 minuto
    max: 100,
    message: 'Demasiadas solicitudes de lectura',
  });

  const downloadLimiter = createRateLimiter({
    windowMs: 60000, // 1 minuto
    max: 30,
    message: 'Demasiadas descargas, espera un momento',
  });

  const writeLimiter = createRateLimiter({
    windowMs: 60000, // 1 minuto
    max: 10,
    message: 'Demasiadas operaciones de escritura',
  });

  // ============================================
  // RUTAS PÚBLICAS (lectura y descarga)
  // ============================================

  /**
   * GET /api/mods
   * Lista todos los mods activos con conteos
   */
  router.get('/', readLimiter, modsController.getAllMods);

  /**
   * GET /api/mods/versions
   * Obtiene versiones de todos los mods (para verificar actualizaciones)
   */
  router.get('/versions', readLimiter, modsController.getModVersions);

  /**
   * GET /api/mods/search
   * Busca mods por texto
   */
  router.get('/search', readLimiter, modsController.searchMods);

  /**
   * GET /api/mods/package
   * Descarga el paquete ZIP con todos los mods requeridos
   */
  router.get('/package', downloadLimiter, modsController.downloadPackage);

  /**
   * GET /api/mods/package/info
   * Obtiene información del paquete sin descargarlo
   */
  router.get('/package/info', readLimiter, modsController.getPackageInfo);

  /**
   * GET /api/mods/:id
   * Obtiene información de un mod específico
   */
  router.get('/:id', readLimiter, modsController.getModById);

  /**
   * GET /api/mods/:id/download
   * Descarga un mod individual
   */
  router.get('/:id/download', downloadLimiter, modsController.downloadMod);

  // ============================================
  // RUTAS DE ADMINISTRACIÓN (requieren auth)
  // ============================================

  /**
   * POST /api/mods
   * Crea un nuevo mod (admin)
   */
  router.post(
    '/',
    adminAuthMiddleware,
    writeLimiter,
    upload.single('file'),
    modsController.createMod
  );

  /**
   * PUT /api/mods/:id
   * Actualiza un mod existente (admin)
   */
  router.put(
    '/:id',
    adminAuthMiddleware,
    writeLimiter,
    upload.single('file'),
    modsController.updateMod
  );

  /**
   * DELETE /api/mods/:id
   * Elimina un mod (soft delete) (admin)
   */
  router.delete(
    '/:id',
    adminAuthMiddleware,
    writeLimiter,
    modsController.deleteMod
  );

  /**
   * POST /api/mods/:id/reactivate
   * Reactiva un mod eliminado (admin)
   */
  router.post(
    '/:id/reactivate',
    adminAuthMiddleware,
    writeLimiter,
    modsController.reactivateMod
  );

  /**
   * POST /api/mods/regenerate-package
   * Regenera el paquete ZIP (admin)
   */
  router.post(
    '/regenerate-package',
    adminAuthMiddleware,
    writeLimiter,
    modsController.regeneratePackage
  );

  return router;
}

export default createModsRouter;
