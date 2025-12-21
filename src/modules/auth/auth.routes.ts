/**
 * Rutas de Autenticación
 * Cobblemon Los Pitufos - Backend API
 * 
 * Define los endpoints de autenticación
 */

import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { requireAuth } from './auth.middleware.js';
import { getUsersCollection } from '../../config/database.js';

/**
 * Crea el router de autenticación
 */
export async function createAuthRouter(): Promise<Router> {
  const router = Router();

  // Obtener colección de usuarios
  const usersCollection = await getUsersCollection();

  // Inicializar servicio y controlador
  const authService = new AuthService(usersCollection);
  const authController = new AuthController(authService);

  /**
   * GET /api/auth/discord
   * Inicia el flujo de autenticación con Discord
   */
  router.get('/discord', authController.initiateDiscordAuth);

  /**
   * GET /api/auth/discord/callback
   * Callback de Discord OAuth
   */
  router.get('/discord/callback', authController.handleDiscordCallback);

  /**
   * POST /api/auth/logout
   * Cierra la sesión del usuario
   */
  router.post('/logout', authController.logout);

  /**
   * GET /api/auth/me
   * Obtiene la información del usuario autenticado
   * Requiere autenticación
   */
  router.get('/me', requireAuth, authController.getCurrentUser);

  return router;
}
