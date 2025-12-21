/**
 * Tests Unitarios - Middleware de Autenticación
 * Cobblemon Los Pitufos - Backend API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireAuth, requireAdmin, optionalAuth } from '../../../../src/modules/auth/auth.middleware.js';
import { generateJWT } from '../../../../src/config/auth.js';
import { Errors } from '../../../../src/shared/middleware/error-handler.js';

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      cookies: {},
    };
    mockRes = {};
    mockNext = vi.fn();
  });

  describe('requireAuth', () => {
    it('debe permitir acceso con token válido en header', () => {
      const token = generateJWT({
        discordId: '123456789',
        discordUsername: 'testuser',
        isAdmin: false,
      });

      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockReq as any).user).toBeDefined();
      expect((mockReq as any).user.discordId).toBe('123456789');
    });

    it('debe permitir acceso con token válido en cookie', () => {
      const token = generateJWT({
        discordId: '123456789',
        discordUsername: 'testuser',
        isAdmin: false,
      });

      mockReq.cookies = {
        auth_token: token,
      };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockReq as any).user).toBeDefined();
    });

    it('debe rechazar solicitud sin token', () => {
      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 401,
      }));
    });

    it('debe rechazar token inválido', () => {
      mockReq.headers = {
        authorization: 'Bearer token_invalido',
      };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 401,
      }));
    });

    it('debe rechazar header de autorización malformado', () => {
      mockReq.headers = {
        authorization: 'InvalidFormat',
      };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 401,
      }));
    });
  });

  describe('requireAdmin', () => {
    it('debe permitir acceso a usuario administrador', () => {
      (mockReq as any).user = {
        discordId: '123456789',
        discordUsername: 'admin',
        isAdmin: true,
      };

      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('debe rechazar usuario no administrador', () => {
      (mockReq as any).user = {
        discordId: '123456789',
        discordUsername: 'user',
        isAdmin: false,
      };

      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403,
      }));
    });

    it('debe rechazar si no hay usuario en request', () => {
      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 401,
      }));
    });
  });

  describe('optionalAuth', () => {
    it('debe agregar usuario si hay token válido', () => {
      const token = generateJWT({
        discordId: '123456789',
        discordUsername: 'testuser',
        isAdmin: false,
      });

      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockReq as any).user).toBeDefined();
    });

    it('debe continuar sin error si no hay token', () => {
      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockReq as any).user).toBeUndefined();
    });

    it('debe continuar sin error si el token es inválido', () => {
      mockReq.headers = {
        authorization: 'Bearer token_invalido',
      };

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockReq as any).user).toBeUndefined();
    });
  });
});
