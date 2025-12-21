/**
 * Tests Unitarios - IP Whitelist Middleware
 * Cobblemon Los Pitufos - Backend API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  getClientIp,
  normalizeIp,
  isIpAuthorized,
} from '../../../src/shared/middleware/ip-whitelist.js';

// Mock del módulo de env
vi.mock('../../../src/config/env.js', () => ({
  env: {
    AUTHORIZED_IPS: ['127.0.0.1', '::1', '192.168.1.0/24'],
  },
}));

describe('IP Whitelist Middleware', () => {
  describe('getClientIp', () => {
    it('debe obtener IP de x-forwarded-for', () => {
      const req = {
        headers: {
          'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
        },
        ip: '127.0.0.1',
      } as unknown as Request;

      const ip = getClientIp(req);
      expect(ip).toBe('203.0.113.195');
    });

    it('debe obtener IP de x-real-ip', () => {
      const req = {
        headers: {
          'x-real-ip': '203.0.113.195',
        },
        ip: '127.0.0.1',
      } as unknown as Request;

      const ip = getClientIp(req);
      expect(ip).toBe('203.0.113.195');
    });

    it('debe usar req.ip como fallback', () => {
      const req = {
        headers: {},
        ip: '192.168.1.100',
      } as unknown as Request;

      const ip = getClientIp(req);
      expect(ip).toBe('192.168.1.100');
    });

    it('debe usar socket.remoteAddress como último recurso', () => {
      const req = {
        headers: {},
        ip: undefined,
        socket: {
          remoteAddress: '10.0.0.1',
        },
      } as unknown as Request;

      const ip = getClientIp(req);
      expect(ip).toBe('10.0.0.1');
    });

    it('debe retornar "unknown" si no hay IP disponible', () => {
      const req = {
        headers: {},
        ip: undefined,
        socket: {},
      } as unknown as Request;

      const ip = getClientIp(req);
      expect(ip).toBe('unknown');
    });
  });

  describe('normalizeIp', () => {
    it('debe convertir ::1 a 127.0.0.1', () => {
      expect(normalizeIp('::1')).toBe('127.0.0.1');
    });

    it('debe convertir ::ffff:127.0.0.1 a 127.0.0.1', () => {
      expect(normalizeIp('::ffff:127.0.0.1')).toBe('127.0.0.1');
    });

    it('debe extraer IPv4 de IPv4-mapped IPv6', () => {
      expect(normalizeIp('::ffff:192.168.1.1')).toBe('192.168.1.1');
    });

    it('debe mantener IPv4 sin cambios', () => {
      expect(normalizeIp('192.168.1.1')).toBe('192.168.1.1');
    });

    it('debe mantener IPv6 regular sin cambios', () => {
      expect(normalizeIp('2001:db8::1')).toBe('2001:db8::1');
    });
  });

  describe('isIpAuthorized', () => {
    const authorizedIps = ['127.0.0.1', '::1', '192.168.1.0/24', '10.0.0.0/16'];

    it('debe autorizar IP exacta en la lista', () => {
      expect(isIpAuthorized('127.0.0.1', authorizedIps)).toBe(true);
    });

    it('debe autorizar ::1 (localhost IPv6)', () => {
      expect(isIpAuthorized('::1', authorizedIps)).toBe(true);
    });

    it('debe autorizar IP en rango /24', () => {
      expect(isIpAuthorized('192.168.1.50', authorizedIps)).toBe(true);
      expect(isIpAuthorized('192.168.1.255', authorizedIps)).toBe(true);
    });

    it('debe rechazar IP fuera del rango /24', () => {
      expect(isIpAuthorized('192.168.2.1', authorizedIps)).toBe(false);
    });

    it('debe autorizar IP en rango /16', () => {
      expect(isIpAuthorized('10.0.50.100', authorizedIps)).toBe(true);
      expect(isIpAuthorized('10.0.255.255', authorizedIps)).toBe(true);
    });

    it('debe rechazar IP fuera del rango /16', () => {
      expect(isIpAuthorized('10.1.0.1', authorizedIps)).toBe(false);
    });

    it('debe rechazar IP no autorizada', () => {
      expect(isIpAuthorized('8.8.8.8', authorizedIps)).toBe(false);
      expect(isIpAuthorized('203.0.113.1', authorizedIps)).toBe(false);
    });

    it('debe manejar lista vacía', () => {
      expect(isIpAuthorized('127.0.0.1', [])).toBe(false);
    });

    it('debe normalizar IPs antes de comparar', () => {
      expect(isIpAuthorized('::ffff:127.0.0.1', authorizedIps)).toBe(true);
    });
  });
});
