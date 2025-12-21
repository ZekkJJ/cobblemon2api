/**
 * Setup de Tests
 * Cobblemon Los Pitufos - Backend API
 * 
 * Configuración global para todos los tests
 */

import { vi } from 'vitest';

// Mock de variables de entorno para tests
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/cobblemon_test';
process.env.DISCORD_CLIENT_ID = 'test_client_id';
process.env.DISCORD_CLIENT_SECRET = 'test_client_secret';
process.env.DISCORD_REDIRECT_URI = 'http://localhost:4000/api/auth/discord/callback';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_only';
process.env.JWT_EXPIRES_IN = '7d';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.AUTHORIZED_IPS = '127.0.0.1,::1';
process.env.PORT = '4000';

// Mock de console.error para tests más limpios
global.console.error = vi.fn();
