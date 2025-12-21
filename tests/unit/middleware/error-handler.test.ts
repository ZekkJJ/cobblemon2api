/**
 * Tests Unitarios - Error Handler Middleware
 * Cobblemon Los Pitufos - Backend API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import {
  AppError,
  ErrorCode,
  Errors,
  errorHandler,
  notFoundHandler,
  asyncHandler,
} from '../../../src/shared/middleware/error-handler.js';

// Mock de isDevelopment
vi.mock('../../../src/config/env.js', () => ({
  isDevelopment: false,
  isProduction: true,
  isTest: true,
}));

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    
    mockReq = {
      method: 'GET',
      path: '/test',
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    
    mockNext = vi.fn();
  });

  describe('AppError', () => {
    it('debe crear un error con valores por defecto', () => {
      const error = new AppError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.isOperational).toBe(true);
    });

    it('debe crear un error con valores personalizados', () => {
      const error = new AppError('Custom error', 400, ErrorCode.VALIDATION_ERROR, 'email');
      
      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.field).toBe('email');
    });
  });

  describe('Errors factory', () => {
    it('debe crear error unauthorized correctamente', () => {
      const error = Errors.unauthorized();
      
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('debe crear error forbidden correctamente', () => {
      const error = Errors.forbidden();
      
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(ErrorCode.FORBIDDEN);
    });

    it('debe crear error notFound con recurso personalizado', () => {
      const error = Errors.notFound('Jugador');
      
      expect(error.message).toBe('Jugador no encontrado');
      expect(error.statusCode).toBe(404);
    });

    it('debe crear error alreadyRolled correctamente', () => {
      const error = Errors.alreadyRolled();
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ErrorCode.ALREADY_ROLLED);
    });

    it('debe crear error insufficientBalance correctamente', () => {
      const error = Errors.insufficientBalance();
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ErrorCode.INSUFFICIENT_BALANCE);
    });

    it('debe crear error rateLimitExceeded correctamente', () => {
      const error = Errors.rateLimitExceeded();
      
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
    });

    it('debe crear error validationError con campo', () => {
      const error = Errors.validationError('Email inválido', 'email');
      
      expect(error.message).toBe('Email inválido');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.field).toBe('email');
    });
  });

  describe('errorHandler middleware', () => {
    it('debe manejar AppError correctamente', () => {
      const error = new AppError('Test error', 400, ErrorCode.VALIDATION_ERROR);
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Test error',
        code: ErrorCode.VALIDATION_ERROR,
      });
    });

    it('debe manejar ZodError correctamente', () => {
      const schema = z.object({ email: z.string().email() });
      let zodError: ZodError | null = null;
      
      try {
        schema.parse({ email: 'invalid' });
      } catch (e) {
        zodError = e as ZodError;
      }
      
      if (zodError) {
        errorHandler(zodError, mockReq as Request, mockRes as Response, mockNext);
        
        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            code: ErrorCode.VALIDATION_ERROR,
          })
        );
      }
    });

    it('debe manejar error genérico sin exponer detalles en producción', () => {
      const error = new Error('Internal details');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Error interno del servidor',
        code: ErrorCode.INTERNAL_ERROR,
      });
    });

    it('debe manejar error de sintaxis JSON', () => {
      const error = Object.assign(new SyntaxError('Unexpected token'), { body: {} });
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'JSON inválido en el cuerpo de la solicitud',
        code: ErrorCode.INVALID_INPUT,
      });
    });
  });

  describe('notFoundHandler', () => {
    it('debe retornar 404 con información de la ruta', () => {
      mockReq.method = 'POST';
      mockReq.path = '/api/unknown';
      
      notFoundHandler(mockReq as Request, mockRes as Response);
      
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Ruta no encontrada: POST /api/unknown',
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe('asyncHandler', () => {
    it('debe pasar errores async al next', async () => {
      const asyncFn = async () => {
        throw new Error('Async error');
      };
      
      const wrapped = asyncHandler(asyncFn);
      
      await wrapped(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('debe ejecutar funciones async exitosas normalmente', async () => {
      const asyncFn = async (req: Request, res: Response) => {
        res.json({ success: true });
      };
      
      const wrapped = asyncHandler(asyncFn);
      
      await wrapped(mockReq as Request, mockRes as Response, mockNext);
      
      expect(jsonMock).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
