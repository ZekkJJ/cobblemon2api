import { Router } from 'express';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { getUsersCollection } from '../../config/database.js';
import { createRateLimiter } from '../../shared/utils/rate-limiter.js';
import { requireAuth, requireAdmin } from '../auth/auth.middleware.js';

export async function createAdminRouter(): Promise<Router> {
  const router = Router();
  const usersCollection = await getUsersCollection();
  const adminService = new AdminService(usersCollection);
  const adminController = new AdminController(adminService);

  const writeLimiter = createRateLimiter({ windowMs: 60000, max: 20, message: 'Demasiadas solicitudes' });

  router.post('/ban', requireAuth, requireAdmin, writeLimiter, adminController.banPlayer);
  router.post('/reset-db', requireAuth, requireAdmin, writeLimiter, adminController.resetDatabase);

  return router;
}
