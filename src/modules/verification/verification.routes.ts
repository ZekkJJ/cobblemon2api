/**
 * Rutas de Verificación
 * Cobblemon Los Pitufos - Backend API
 * 
 * Define las rutas HTTP para el módulo de verificación
 */

import { Router } from 'express';
import { VerificationController } from './verification.controller.js';
import { VerificationService } from './verification.service.js';
import { getUsersCollection } from '../../config/database.js';
import { createRateLimiter } from '../../shared/utils/rate-limiter.js';
import { ipWhitelistMiddleware } from '../../shared/middleware/ip-whitelist.js';

/**
 * Crea el router de verificación (endpoints del plugin)
 */
export async function createVerificationRouter(): Promise<Router> {
  const router = Router();

  // Obtener colección
  const usersCollection = await getUsersCollection();

  // Crear servicio y controlador
  const verificationService = new VerificationService(usersCollection);
  const verificationController = new VerificationController(verificationService);

  // Rate limiters
  const verificationLimiter = createRateLimiter({
    windowMs: 60000, // 1 minuto
    max: 5, // 5 intentos de verificación por minuto por IP
    message: 'Demasiados intentos de verificación, intenta de nuevo más tarde',
  });

  const pluginLimiter = createRateLimiter({
    windowMs: 60000, // 1 minuto
    max: 60, // 60 solicitudes por minuto
    message: 'Demasiadas solicitudes de verificación, intenta de nuevo más tarde',
  });

  // ============================================
  // RUTAS DEL PLUGIN (requieren IP autorizada)
  // ============================================

  /**
   * POST /api/verification/generate
   * Genera un código de verificación
   */
  router.post('/generate', ipWhitelistMiddleware, pluginLimiter, verificationController.generateCode);

  /**
   * POST /api/verification/verify
   * Verifica un código desde el plugin
   * Rate limit: 5 intentos por minuto por IP
   */
  router.post('/verify', ipWhitelistMiddleware, verificationLimiter, verificationController.verifyFromPlugin);

  return router;
}

/**
 * Crea el router de verificación web (endpoints de la web)
 */
export async function createVerifyRouter(): Promise<Router> {
  const router = Router();

  // Obtener colección
  const usersCollection = await getUsersCollection();

  // Crear servicio y controlador
  const verificationService = new VerificationService(usersCollection);
  const verificationController = new VerificationController(verificationService);

  // Rate limiters
  const verificationLimiter = createRateLimiter({
    windowMs: 60000, // 1 minuto
    max: 5, // 5 intentos de verificación por minuto por IP
    message: 'Demasiados intentos de verificación, intenta de nuevo más tarde',
  });

  const webLimiter = createRateLimiter({
    windowMs: 60000, // 1 minuto
    max: 20, // 20 solicitudes por minuto
    message: 'Demasiadas solicitudes de verificación, intenta de nuevo más tarde',
  });

  const pluginLimiter = createRateLimiter({
    windowMs: 60000, // 1 minuto
    max: 60, // 60 solicitudes por minuto
    message: 'Demasiadas solicitudes de verificación, intenta de nuevo más tarde',
  });

  // ============================================
  // RUTAS WEB
  // ============================================

  /**
   * GET /api/verify/check
   * Verifica el estado de un código (polling desde plugin)
   */
  router.get('/check', pluginLimiter, verificationController.checkCodeStatus);

  /**
   * POST /api/verify/check
   * Verifica un código desde la web y vincula con Discord
   * Rate limit: 5 intentos por minuto por IP
   */
  router.post('/check', verificationLimiter, verificationController.verifyFromWeb);

  /**
   * POST /api/verify/register
   * Registra una verificación pendiente (desde plugin)
   * Alias de /api/verification/generate para compatibilidad
   */
  router.post('/register', ipWhitelistMiddleware, pluginLimiter, verificationController.registerVerification);

  return router;
}
