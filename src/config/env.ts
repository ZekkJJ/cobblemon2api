/**
 * Configuración de Variables de Entorno
 * Cobblemon Los Pitufos - Backend API
 * 
 * Este módulo centraliza y valida todas las variables de entorno
 * necesarias para el funcionamiento del servidor.
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

/**
 * Esquema de validación para variables de entorno
 */
const envSchema = z.object({
  // Servidor
  PORT: z.string().default('4000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // MongoDB
  MONGODB_URI: z.string().min(1, 'MONGODB_URI es requerido'),
  MONGODB_DB: z.string().default('cobblemon_pitufos'),

  // Discord OAuth
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID es requerido'),
  DISCORD_CLIENT_SECRET: z.string().min(1, 'DISCORD_CLIENT_SECRET es requerido'),
  DISCORD_REDIRECT_URI: z.string().url('DISCORD_REDIRECT_URI debe ser una URL válida'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Frontend
  FRONTEND_URL: z.string().url('FRONTEND_URL debe ser una URL válida'),

  // Discord Webhook (opcional)
  DISCORD_WEBHOOK_URL: z.string().url().optional(),

  // Groq API (opcional para Soul Driven)
  GROQ_API_KEY: z.string().optional(),

  // Seguridad
  AUTHORIZED_IPS: z.string().default('127.0.0.1,::1').transform(val => val.split(',')),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  SYNC_RATE_LIMIT_MAX: z.string().default('60').transform(Number),

  // Minecraft Server
  MINECRAFT_SERVER_IP: z.string().optional(),
  MINECRAFT_SERVER_PORT: z.string().default('25565').transform(Number),
});

/**
 * Tipo inferido de las variables de entorno validadas
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Función para validar y obtener la configuración de entorno
 */
function validateEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
      console.error('❌ Error de configuración de entorno:\n' + missingVars);
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Configuración de entorno validada y exportada
 */
export const env = validateEnv();

/**
 * Helpers para verificar el entorno
 */
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
