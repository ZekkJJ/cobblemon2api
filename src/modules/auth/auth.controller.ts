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
    
    // Redirigir directamente a Discord en lugar de devolver JSON
    return res.redirect(authUrl);
  });

  /**
   * GET /api/auth/discord/callback
   * Callback de Discord OAuth
   */
  handleDiscordCallback = asyncHandler(async (req: Request, res: Response) => {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/auth/callback?error=no_code`);
    }

    try {
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

      // Convertir usuario a sesión
      const userSession = toUserSession(user);

      // Redirigir al frontend con datos del usuario
      const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000';
      const userData = encodeURIComponent(JSON.stringify(userSession));
      return res.redirect(`${frontendUrl}/auth/callback?user=${userData}`);
    } catch (error: any) {
      console.error('Discord OAuth callback error:', error);
      const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000';
      const errorMsg = encodeURIComponent(error.message || 'Error de autenticación');
      return res.redirect(`${frontendUrl}/auth/callback?error=${errorMsg}`);
    }
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

  /**
   * POST /api/auth/verify-username
   * Verifica/registra un usuario por nombre de Discord (sin OAuth)
   */
  verifyUsername = asyncHandler(async (req: Request, res: Response) => {
    const { discordUsername, nickname } = req.body;

    // Validar entrada
    if (!discordUsername || typeof discordUsername !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'El nombre de usuario de Discord es requerido',
      });
    }

    // Limpiar el username
    const cleanUsername = discordUsername.trim();

    if (cleanUsername.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de usuario debe tener al menos 2 caracteres',
      });
    }

    // Crear o actualizar usuario
    const result = await this.authService.verifyUsernameAuth(
      cleanUsername,
      nickname?.trim()
    );

    return res.json({
      success: true,
      user: result.user,
      token: result.token,
    });
  });
}
