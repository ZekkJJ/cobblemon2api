/**
 * Controlador de Verificación
 * Cobblemon Los Pitufos - Backend API
 * 
 * Maneja las solicitudes HTTP relacionadas con verificación
 */

import { Request, Response } from 'express';
import { VerificationService } from './verification.service.js';
import { asyncHandler, Errors } from '../../shared/middleware/error-handler.js';
import { z } from 'zod';

/**
 * Esquema de validación para generar código
 */
const generateCodeSchema = z.object({
  minecraftUuid: z.string().uuid('UUID de Minecraft inválido'),
  minecraftUsername: z.string().min(1, 'Username es requerido'),
  code: z.string().length(5, 'El código debe tener 5 dígitos').optional(),
});

/**
 * Esquema de validación para verificar código desde plugin
 */
const verifyFromPluginSchema = z.object({
  minecraftUuid: z.string().uuid('UUID de Minecraft inválido'),
  code: z.string().length(5, 'El código debe tener 5 dígitos'),
});

/**
 * Esquema de validación para verificar código desde web
 */
const verifyFromWebSchema = z.object({
  code: z.string().length(5, 'El código debe tener 5 dígitos'),
  discordId: z.string().min(1, 'Discord ID es requerido'),
  discordUsername: z.string().optional(),
});

export class VerificationController {
  constructor(private verificationService: VerificationService) {}

  /**
   * POST /api/verification/generate
   * Genera un código de verificación (desde plugin)
   */
  generateCode = asyncHandler(async (req: Request, res: Response) => {
    // Validar datos de entrada
    const validatedData = generateCodeSchema.parse(req.body);

    // Si el plugin ya generó el código, usarlo; si no, generar uno nuevo
    let code = validatedData.code;
    if (!code) {
      const result = await this.verificationService.generateVerificationCode(
        validatedData.minecraftUuid,
        validatedData.minecraftUsername
      );
      code = result.code;
    } else {
      // El plugin ya generó el código, solo guardarlo
      await this.verificationService.generateVerificationCode(
        validatedData.minecraftUuid,
        validatedData.minecraftUsername
      );
    }

    res.json({
      success: true,
      code,
    });
  });

  /**
   * POST /api/verification/verify
   * Verifica un código desde el plugin
   */
  verifyFromPlugin = asyncHandler(async (req: Request, res: Response) => {
    // Validar datos de entrada
    const validatedData = verifyFromPluginSchema.parse(req.body);

    // Verificar código
    const result = await this.verificationService.verifyCodeFromPlugin(
      validatedData.minecraftUuid,
      validatedData.code
    );

    res.json(result);
  });

  /**
   * POST /api/verify/check
   * Verifica un código desde la web y vincula con Discord
   */
  verifyFromWeb = asyncHandler(async (req: Request, res: Response) => {
    // Validar datos de entrada
    const validatedData = verifyFromWebSchema.parse(req.body);

    // Verificar código y vincular con Discord
    const result = await this.verificationService.verifyCodeFromWeb(
      validatedData.code,
      validatedData.discordId,
      validatedData.discordUsername || ''
    );

    res.json(result);
  });

  /**
   * GET /api/verify/check
   * Verifica el estado de un código (polling desde plugin)
   */
  checkCodeStatus = asyncHandler(async (req: Request, res: Response) => {
    const code = req.query['code'] as string;

    if (!code) {
      throw Errors.validationError('Código es requerido');
    }

    if (code.length !== 5) {
      throw Errors.validationError('El código debe tener 5 dígitos');
    }

    const status = await this.verificationService.checkCodeStatus(code);

    res.json(status);
  });

  /**
   * POST /api/verify/register
   * Registra una verificación pendiente (desde plugin)
   * Alias de generateCode para compatibilidad
   */
  registerVerification = asyncHandler(async (req: Request, res: Response) => {
    // Mapear campos del formato antiguo al nuevo
    const body = req.body;
    const mappedBody = {
      minecraftUuid: body.uuid,
      minecraftUsername: body.username,
      code: body.code,
    };

    // Validar datos de entrada
    const validatedData = generateCodeSchema.parse(mappedBody);

    // Generar/guardar código
    await this.verificationService.generateVerificationCode(
      validatedData.minecraftUuid,
      validatedData.minecraftUsername
    );

    res.json({
      success: true,
    });
  });
}
