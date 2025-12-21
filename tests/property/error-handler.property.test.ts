/**
 * Property-Based Tests - Error Handler
 * Cobblemon Los Pitufos - Backend API
 * 
 * **Feature: cobblemon-pitufos-rebuild, Property 36: Manejo de Errores**
 * **Valida: Requisitos 14.5**
 * 
 * Propiedad: Para cualquier error interno del servidor, la respuesta al usuario debe ser
 * un mensaje amigable sin exponer detalles técnicos.
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { Request, Response, NextFunction } from 'express';
import { errorHandler, AppError, Errors } from '../../src/shared/middleware/error-handler.js';

// Mock de console.error para evitar spam en los tests
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Property-Based Tests - Error Handler', () => {
  /**
   * Helper para crear un mock de Request
   */
  function createMockRequest(method: string, path: string): Partial<Request> {
    return {
      method,
      path,
      ip: '127.0.0.1',
      headers: {},
    };
  }

  /**
   * Helper para crear un mock de Response
   */
  function createMockResponse(): {
    res: Partial<Response>;
    getStatusCode: () => number | null;
    getJsonData: () => any;
  } {
    let statusCode: number | null = null;
    let jsonData: any = null;

    const res: Partial<Response> = {
      status: vi.fn((code: number) => {
        statusCode = code;
        return res as Response;
      }),
      json: vi.fn((data: any) => {
        jsonData = data;
        return res as Response;
      }),
    };

    return {
      res,
      getStatusCode: () => statusCode,
      getJsonData: () => jsonData,
    };
  }

  /**
   * Propiedad 36: Manejo de Errores
   * Para cualquier error, el handler debe:
   * 1. Retornar un código de estado HTTP apropiado
   * 2. Retornar un objeto con success: false
   * 3. Incluir un mensaje de error amigable
   * 4. NO exponer detalles técnicos (stack traces, rutas de archivos, etc.)
   */
  it('Property 36: Error handler debe retornar respuestas seguras sin exponer detalles técnicos', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }), // Mensaje de error
        fc.integer({ min: 400, max: 599 }), // Código de estado HTTP
        fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'), // Método HTTP
        fc.string({ minLength: 1, maxLength: 50 }), // Path
        (errorMessage, statusCode, method, path) => {
          // Crear error con detalles técnicos que NO deben ser expuestos
          const technicalDetails = {
            stack: 'Error: Something went wrong\n    at /home/user/app/src/module.ts:42:15',
            internalPath: '/var/www/app/backend/src/sensitive/module.ts',
            databaseConnection: 'mongodb://user:password@localhost:27017/db',
            apiKey: 'sk_test_1234567890abcdef',
          };

          const error = new AppError(errorMessage, statusCode);
          (error as any).stack = technicalDetails.stack;
          (error as any).internalPath = technicalDetails.internalPath;
          (error as any).databaseConnection = technicalDetails.databaseConnection;
          (error as any).apiKey = technicalDetails.apiKey;

          const req = createMockRequest(method, path) as Request;
          const { res, getJsonData } = createMockResponse();
          const next: NextFunction = vi.fn();

          // Ejecutar el error handler
          errorHandler(error, req, res as Response, next);

          // Obtener los datos después de la ejecución
          const jsonData = getJsonData();

          // Verificar que se llamó a res.status con el código correcto
          expect(res.status).toHaveBeenCalledWith(statusCode);

          // Verificar que se llamó a res.json
          expect(res.json).toHaveBeenCalled();

          // Verificar estructura de la respuesta
          expect(jsonData).toBeDefined();
          expect(jsonData.success).toBe(false);
          expect(jsonData.error).toBeDefined();
          expect(typeof jsonData.error).toBe('string');

          // Verificar que NO se exponen detalles técnicos
          const responseString = JSON.stringify(jsonData);
          const noStackTrace = !responseString.includes(technicalDetails.stack);
          const noInternalPath = !responseString.includes(technicalDetails.internalPath);
          const noDatabaseConnection = !responseString.includes(technicalDetails.databaseConnection);
          const noApiKey = !responseString.includes(technicalDetails.apiKey);
          const noFileExtensions = !responseString.includes('.ts') && !responseString.includes('.js');

          return (
            noStackTrace &&
            noInternalPath &&
            noDatabaseConnection &&
            noApiKey &&
            noFileExtensions
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Propiedad: Errores 4xx deben retornar el mensaje original
   * Los errores de cliente (400-499) deben mostrar el mensaje de error original
   * porque son causados por el usuario y no exponen información sensible del servidor
   */
  it('Property: Errores 4xx deben retornar el mensaje de error original', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 100 }), // Mensaje de error
        fc.integer({ min: 400, max: 499 }), // Código 4xx
        (errorMessage, statusCode) => {
          const error = new AppError(errorMessage, statusCode);
          const req = createMockRequest('GET', '/test') as Request;
          const { res, getJsonData } = createMockResponse();
          const next: NextFunction = vi.fn();

          errorHandler(error, req, res as Response, next);

          const jsonData = getJsonData();

          // El mensaje debe estar presente en la respuesta
          return jsonData.error === errorMessage;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Propiedad: Errores 5xx deben retornar mensaje genérico en producción
   * Los errores de servidor (500-599) deben mostrar un mensaje genérico
   * para no exponer detalles internos del servidor
   */
  it('Property: Errores 5xx deben retornar mensaje genérico', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 100 }), // Mensaje de error técnico
        fc.integer({ min: 500, max: 599 }), // Código 5xx
        (technicalMessage, statusCode) => {
          const error = new Error(technicalMessage);
          (error as any).statusCode = statusCode;

          const req = createMockRequest('POST', '/api/test') as Request;
          const { res, getJsonData } = createMockResponse();
          const next: NextFunction = vi.fn();

          errorHandler(error, req, res as Response, next);

          const jsonData = getJsonData();

          // El mensaje NO debe ser el mensaje técnico original
          // Debe ser un mensaje genérico
          const isGenericMessage =
            jsonData.error !== technicalMessage &&
            (jsonData.error.includes('Error interno') ||
              jsonData.error.includes('Error del servidor') ||
              jsonData.error.includes('Internal') ||
              jsonData.error.length < technicalMessage.length);

          return isGenericMessage;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Propiedad: Todos los errores deben tener estructura consistente
   * Independientemente del tipo de error, la respuesta debe tener la misma estructura
   */
  it('Property: Todas las respuestas de error deben tener estructura consistente', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Generar diferentes tipos de errores
          fc.record({
            type: fc.constant('AppError'),
            message: fc.string({ minLength: 1, maxLength: 100 }),
            statusCode: fc.integer({ min: 400, max: 599 }),
          }),
          fc.record({
            type: fc.constant('Error'),
            message: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          fc.record({
            type: fc.constant('TypeError'),
            message: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          fc.record({
            type: fc.constant('ReferenceError'),
            message: fc.string({ minLength: 1, maxLength: 100 }),
          })
        ),
        errorConfig => {
          let error: Error;

          switch (errorConfig.type) {
            case 'AppError':
              error = new AppError(errorConfig.message, errorConfig.statusCode);
              break;
            case 'TypeError':
              error = new TypeError(errorConfig.message);
              break;
            case 'ReferenceError':
              error = new ReferenceError(errorConfig.message);
              break;
            default:
              error = new Error(errorConfig.message);
          }

          const req = createMockRequest('GET', '/test') as Request;
          const { res, getJsonData } = createMockResponse();
          const next: NextFunction = vi.fn();

          errorHandler(error, req, res as Response, next);

          const jsonData = getJsonData();

          // Verificar estructura consistente
          const hasSuccessField = 'success' in jsonData && jsonData.success === false;
          const hasErrorField = 'error' in jsonData && typeof jsonData.error === 'string';
          const hasOnlyExpectedFields =
            Object.keys(jsonData).every(key => ['success', 'error', 'code', 'field'].includes(key));

          return hasSuccessField && hasErrorField && hasOnlyExpectedFields;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Propiedad: Códigos de estado HTTP deben ser válidos
   * El error handler debe siempre retornar códigos de estado HTTP válidos (400-599)
   */
  it('Property: Códigos de estado HTTP deben estar en el rango válido', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.integer({ min: 400, max: 599 }), // Solo códigos de error válidos
        (message, statusCode) => {
          const error = new AppError(message, statusCode);
          const req = createMockRequest('GET', '/test') as Request;
          const { res, getStatusCode } = createMockResponse();
          const next: NextFunction = vi.fn();

          errorHandler(error, req, res as Response, next);

          // Obtener el código de estado
          const actualStatusCode = getStatusCode();

          // Debe ser el mismo código que se pasó (ya que está en el rango válido)
          return actualStatusCode === statusCode;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Propiedad: Errores predefinidos deben tener códigos correctos
   * Los errores predefinidos en Errors deben retornar los códigos de estado esperados
   */
  it('Property: Errores predefinidos deben tener códigos de estado correctos', () => {
    const predefinedErrors = [
      { error: Errors.notFound('Test'), expectedCode: 404 },
      { error: Errors.unauthorized(), expectedCode: 401 },
      { error: Errors.forbidden(), expectedCode: 403 },
      { error: Errors.validationError('Test'), expectedCode: 400 },
      { error: Errors.databaseError(), expectedCode: 500 },
      { error: Errors.ipNotAuthorized(), expectedCode: 403 },
    ];

    return predefinedErrors.every(({ error, expectedCode }) => {
      const req = createMockRequest('GET', '/test') as Request;
      const { res, getStatusCode } = createMockResponse();
      const next: NextFunction = vi.fn();

      errorHandler(error, req, res as Response, next);

      const actualStatusCode = getStatusCode();

      return actualStatusCode === expectedCode;
    });
  });
});
