/**
 * Configuración de Autenticación Discord OAuth
 * Cobblemon Los Pitufos - Backend API
 * 
 * Este módulo contiene la configuración para la autenticación
 * con Discord OAuth2 y la generación/verificación de JWT.
 */

import jwt from 'jsonwebtoken';
import { env } from './env.js';

/**
 * URLs de Discord OAuth2
 */
export const DISCORD_API = {
  AUTHORIZE_URL: 'https://discord.com/api/oauth2/authorize',
  TOKEN_URL: 'https://discord.com/api/oauth2/token',
  USER_URL: 'https://discord.com/api/users/@me',
  GUILDS_URL: 'https://discord.com/api/users/@me/guilds',
};

/**
 * Scopes de Discord OAuth2
 */
export const DISCORD_SCOPES = ['identify', 'guilds'];

/**
 * Genera la URL de autorización de Discord
 */
export function getDiscordAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    redirect_uri: env.DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: DISCORD_SCOPES.join(' '),
  });

  if (state) {
    params.append('state', state);
  }

  return `${DISCORD_API.AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Intercambia el código de autorización por tokens de acceso
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}> {
  const response = await fetch(DISCORD_API.TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.DISCORD_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error intercambiando código: ${error}`);
  }

  return response.json() as Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
  }>;
}

/**
 * Obtiene la información del usuario de Discord
 */
export async function getDiscordUser(accessToken: string): Promise<{
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name: string | null;
}> {
  const response = await fetch(DISCORD_API.USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error obteniendo usuario de Discord');
  }

  return response.json() as Promise<{
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    global_name: string | null;
  }>;
}

/**
 * Payload del JWT
 */
export interface JWTPayload {
  discordId: string;
  discordUsername: string;
  discordAvatar?: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

/**
 * Genera un JWT para el usuario
 */
export function generateJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * Verifica y decodifica un JWT
 */
export function verifyJWT(token: string): JWTPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Token inválido o expirado');
  }
}

/**
 * Extrae el token del header Authorization
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  
  return parts[1] || null;
}

/**
 * Genera la URL del avatar de Discord
 */
export function getDiscordAvatarUrl(userId: string, avatarHash: string | null): string {
  if (!avatarHash) {
    // Avatar por defecto de Discord
    const defaultAvatarIndex = parseInt(userId) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
  }
  
  const extension = avatarHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}`;
}
