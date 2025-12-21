/**
 * Controlador de Autenticación
 * Cobblemon Los Pitufos - Backend API
 * 
 * Maneja las solicitudes HTTP relacionadas con autenticación
 */

import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { getDiscordAuthUrl } from '../../config/auth.js';
import { toUserSession } from '../../shared/types/user.types.js';
import { asyncHandler } from '../../shared/middleware/error-handler.js';
import { env } from '../../config/env.js';

export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * GET /api/auth/discord
   * Redirige al usuario a Discord OAuth
   */
  initiateDiscordAuth = asyncHandler(async (req: Request, res: Response) => {
    // Generar state para prevenir CSRF
    const state = Math.random().toString(36).substring(7);
    
    // Guardar state en sesión (en producción usar Redis)
    // Por ahora lo enviamos en la URL de callback
    
    const authUrl = getDiscordAuthUrl(state);
    
    res.json({
      success: true,
      authUrl,
      state,
    });
  });

  /**
   * GET /api/auth/discord/callback
   * Callback de Discord OAuth
   */
  handleDiscordCallback = asyncHandler(async (req: Request, res: Response) => {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Código de autorización no proporcionado',
      });
    }

    // TODO: Validar state para prevenir CSRF en producción

    // Procesar callback
    const { user, token } = await this.authService.handleDiscordCallback(code);

    // Verificar si está baneado
    await this.authService.checkUserBan(user.discordId!);

    // En producción, establecer cookie httpOnly
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    // Redirigir al frontend
    const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}?auth=success`);
  });

  /**
   * POST /api/auth/logout
   * Cierra la sesión del usuario
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    // Limpiar cookie
    res.clearCookie('auth_token');

    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente',
    });
  });

  /**
   * GET /api/auth/me
   * Obtiene la información del usuario autenticado
   */
  getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    // El middleware de autenticación ya validó el token y agregó req.user
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado',
      });
    }

    // Obtener datos completos del usuario
    const fullUser = await this.authService.getUserByDiscordId(user.discordId);

    // Convertir a sesión de usuario (sin datos sensibles)
    const userSession = toUserSession(fullUser);

    return res.json({
      success: true,
      user: userSession,
    });
  });
}
