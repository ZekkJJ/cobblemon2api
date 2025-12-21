/**
 * Controlador de Tienda - Cobblemon Los Pitufos Backend API
 */

import { Request, Response } from 'express';
import { ShopService } from './shop.service.js';
import { asyncHandler, Errors } from '../../shared/middleware/error-handler.js';
import { z } from 'zod';

const purchaseSchema = z.object({
  uuid: z.string().uuid(),
  ballId: z.string().min(1),
  quantity: z.number().int().min(1),
});

const claimSchema = z.object({
  uuid: z.string().uuid(),
  purchaseId: z.string().min(1),
});

export class ShopController {
  constructor(private shopService: ShopService) {}

  getStock = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.shopService.getStock();
    res.json(result);
  });

  getBalance = asyncHandler(async (req: Request, res: Response) => {
    const uuid = req.query['uuid'] as string;
    if (!uuid) throw Errors.validationError('UUID es requerido');
    const result = await this.shopService.getBalance(uuid);
    res.json(result);
  });

  purchase = asyncHandler(async (req: Request, res: Response) => {
    const validatedData = purchaseSchema.parse(req.body);
    const result = await this.shopService.purchase(validatedData.uuid, validatedData.ballId, validatedData.quantity);
    res.json(result);
  });

  getPurchases = asyncHandler(async (req: Request, res: Response) => {
    const uuid = req.query['uuid'] as string;
    if (!uuid) throw Errors.validationError('UUID es requerido');
    const result = await this.shopService.getPurchases(uuid);
    res.json(result);
  });

  claimPurchase = asyncHandler(async (req: Request, res: Response) => {
    const validatedData = claimSchema.parse(req.body);
    const result = await this.shopService.claimPurchase(validatedData.uuid, validatedData.purchaseId);
    res.json(result);
  });
}
