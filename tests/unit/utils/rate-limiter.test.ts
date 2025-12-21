/**
 * Tests Unitarios - Rate Limiter
 * Cobblemon Los Pitufos - Backend API
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkUuidRateLimit,
  getUuidRateLimitReset,
} from '../../../src/shared/utils/rate-limiter.js';

// Mock del módulo de env
vi.mock('../../../src/config/env.js', () => ({
  env: {
    RATE_LIMIT_WINDOW_MS: 60000,
    RATE_LIMIT_MAX_REQUESTS: 100,
    SYNC_RATE_LIMIT_MAX: 60,
  },
}));

describe('Rate Limiter - UUID Based', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkUuidRateLimit', () => {
    it('debe permitir la primera solicitud', () => {
      const result = checkUuidRateLimit('test-uuid-1', 5, 60000);
      expect(result).toBe(true);
    });

    it('debe permitir solicitudes dentro del límite', () => {
      const uuid = 'test-uuid-2';
      const maxRequests = 3;
      
      expect(checkUuidRateLimit(uuid, maxRequests, 60000)).toBe(true);
      expect(checkUuidRateLimit(uuid, maxRequests, 60000)).toBe(true);
      expect(checkUuidRateLimit(uuid, maxRequests, 60000)).toBe(true);
    });

    it('debe bloquear solicitudes que exceden el límite', () => {
      const uuid = 'test-uuid-3';
      const maxRequests = 2;
      
      expect(checkUuidRateLimit(uuid, maxRequests, 60000)).toBe(true);
      expect(checkUuidRateLimit(uuid, maxRequests, 60000)).toBe(true);
      expect(checkUuidRateLimit(uuid, maxRequests, 60000)).toBe(false);
    });

    it('debe resetear el contador después de la ventana de tiempo', () => {
      const uuid = 'test-uuid-4';
      const maxRequests = 2;
      const windowMs = 60000;
      
      // Usar todas las solicitudes
      expect(checkUuidRateLimit(uuid, maxRequests, windowMs)).toBe(true);
      expect(checkUuidRateLimit(uuid, maxRequests, windowMs)).toBe(true);
      expect(checkUuidRateLimit(uuid, maxRequests, windowMs)).toBe(false);
      
      // Avanzar el tiempo más allá de la ventana
      vi.advanceTimersByTime(windowMs + 1000);
      
      // Debe permitir nuevas solicitudes
      expect(checkUuidRateLimit(uuid, maxRequests, windowMs)).toBe(true);
    });

    it('debe manejar múltiples UUIDs independientemente', () => {
      const uuid1 = 'test-uuid-5a';
      const uuid2 = 'test-uuid-5b';
      const maxRequests = 2;
      
      // UUID1 usa sus solicitudes
      expect(checkUuidRateLimit(uuid1, maxRequests, 60000)).toBe(true);
      expect(checkUuidRateLimit(uuid1, maxRequests, 60000)).toBe(true);
      expect(checkUuidRateLimit(uuid1, maxRequests, 60000)).toBe(false);
      
      // UUID2 debe tener su propio límite
      expect(checkUuidRateLimit(uuid2, maxRequests, 60000)).toBe(true);
      expect(checkUuidRateLimit(uuid2, maxRequests, 60000)).toBe(true);
    });
  });

  describe('getUuidRateLimitReset', () => {
    it('debe retornar 0 para UUID sin límite activo', () => {
      const result = getUuidRateLimitReset('nonexistent-uuid');
      expect(result).toBe(0);
    });

    it('debe retornar tiempo restante para UUID con límite activo', () => {
      const uuid = 'test-uuid-6';
      const windowMs = 60000;
      
      // Activar el rate limit
      checkUuidRateLimit(uuid, 5, windowMs);
      
      // Avanzar 30 segundos
      vi.advanceTimersByTime(30000);
      
      const remaining = getUuidRateLimitReset(uuid);
      
      // Debe quedar aproximadamente 30 segundos
      expect(remaining).toBeGreaterThan(29000);
      expect(remaining).toBeLessThanOrEqual(30000);
    });

    it('debe retornar 0 después de que expire la ventana', () => {
      const uuid = 'test-uuid-7';
      const windowMs = 60000;
      
      // Activar el rate limit
      checkUuidRateLimit(uuid, 5, windowMs);
      
      // Avanzar más allá de la ventana
      vi.advanceTimersByTime(windowMs + 1000);
      
      const remaining = getUuidRateLimitReset(uuid);
      expect(remaining).toBe(0);
    });
  });
});
