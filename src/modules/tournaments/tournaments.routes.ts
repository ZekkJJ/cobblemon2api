import { Router } from 'express';
import { TournamentsController } from './tournaments.controller.js';
import { TournamentsService } from './tournaments.service.js';
import { getTournamentsCollection } from '../../config/database.js';
import { createRateLimiter } from '../../shared/utils/rate-limiter.js';
import { requireAuth, requireAdmin } from '../auth/auth.middleware.js';

export async function createTournamentsRouter(): Promise<Router> {
  const router = Router();
  const tournamentsCollection = await getTournamentsCollection();
  const tournamentsService = new TournamentsService(tournamentsCollection);
  const tournamentsController = new TournamentsController(tournamentsService);

  const readLimiter = createRateLimiter({ windowMs: 60000, max: 100, message: 'Demasiadas solicitudes' });
  const writeLimiter = createRateLimiter({ windowMs: 60000, max: 20, message: 'Demasiadas solicitudes' });

  router.get('/', readLimiter, tournamentsController.getAllTournaments);
  router.get('/:id', readLimiter, tournamentsController.getTournamentById);
  router.post('/', requireAuth, requireAdmin, writeLimiter, tournamentsController.createTournament);
  router.put('/:id', requireAuth, requireAdmin, writeLimiter, tournamentsController.updateTournament);
  router.delete('/:id', requireAuth, requireAdmin, writeLimiter, tournamentsController.deleteTournament);

  return router;
}
