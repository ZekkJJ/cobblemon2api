/**
 * Rutas de Torneos - Cobblemon Los Pitufos Backend API
 * Sistema completo de gestión de torneos con brackets y códigos únicos.
 */

import { Router } from 'express';
import { TournamentsController } from './tournaments.controller.js';
import { TournamentsService } from './tournaments.service.js';
import { getTournamentsCollection } from '../../config/database.js';
import { createRateLimiter } from '../../shared/utils/rate-limiter.js';
import { requireAuth, requireAdmin, optionalAuth } from '../auth/auth.middleware.js';
import { ipWhitelistMiddleware } from '../../shared/middleware/ip-whitelist.js';

export async function createTournamentsRouter(): Promise<Router> {
  const router = Router();
  const tournamentsCollection = await getTournamentsCollection();
  const tournamentsService = new TournamentsService(tournamentsCollection);
  const tournamentsController = new TournamentsController(tournamentsService);

  // Rate limiters
  const readLimiter = createRateLimiter({ windowMs: 60000, max: 100, message: 'Demasiadas solicitudes' });
  const writeLimiter = createRateLimiter({ windowMs: 60000, max: 20, message: 'Demasiadas solicitudes' });
  const pluginLimiter = createRateLimiter({ windowMs: 60000, max: 50, message: 'Demasiadas solicitudes del plugin' });

  // ============================================
  // RUTAS PÚBLICAS (Lectura)
  // ============================================
  
  // Listar todos los torneos
  router.get('/', readLimiter, tournamentsController.getAllTournaments);
  
  // Obtener torneos activos
  router.get('/active', readLimiter, tournamentsController.getActiveTournaments);
  
  // Obtener torneo por ID
  router.get('/:id', readLimiter, tournamentsController.getTournamentById);
  
  // Obtener torneo por código
  router.get('/code/:code', readLimiter, tournamentsController.getTournamentByCode);

  // ============================================
  // RUTAS DE ADMINISTRACIÓN
  // ============================================
  
  // Crear torneo (admin)
  router.post('/', requireAuth, requireAdmin, writeLimiter, tournamentsController.createTournament);
  
  // Actualizar torneo (admin)
  router.put('/:id', requireAuth, requireAdmin, writeLimiter, tournamentsController.updateTournament);
  
  // Eliminar torneo (admin)
  router.delete('/:id', requireAuth, requireAdmin, writeLimiter, tournamentsController.deleteTournament);
  
  // Iniciar torneo (admin)
  router.post('/:id/start', requireAuth, requireAdmin, writeLimiter, tournamentsController.startTournament);
  
  // Cancelar torneo (admin)
  router.post('/:id/cancel', requireAuth, requireAdmin, writeLimiter, tournamentsController.cancelTournament);
  
  // Forzar resultado de match (admin)
  router.post('/matches/:matchId/force', requireAuth, requireAdmin, writeLimiter, tournamentsController.forceMatchResult);
  
  // Remover participante (admin)
  router.delete('/:id/participants/:participantId', requireAuth, requireAdmin, writeLimiter, tournamentsController.removeParticipant);
  
  // Reordenar participantes (admin)
  router.post('/:id/reorder', requireAuth, requireAdmin, writeLimiter, tournamentsController.reorderParticipants);

  // ============================================
  // RUTAS DEL PLUGIN (Minecraft)
  // ============================================
  
  // Registrar participante por código (plugin)
  router.post('/register', ipWhitelistMiddleware, pluginLimiter, tournamentsController.registerParticipantByCode);
  
  // Registrar participante por ID de torneo (plugin)
  router.post('/:id/register', ipWhitelistMiddleware, pluginLimiter, tournamentsController.registerParticipant);
  
  // Reportar resultado de batalla (plugin)
  router.post('/matches/:matchId/result', ipWhitelistMiddleware, pluginLimiter, tournamentsController.recordMatchResult);
  
  // Buscar match por participantes (plugin)
  router.post('/find-match', ipWhitelistMiddleware, pluginLimiter, tournamentsController.findMatchByParticipants);
  
  // Obtener torneo activo de un jugador (plugin)
  router.get('/player/:uuid', ipWhitelistMiddleware, pluginLimiter, tournamentsController.getParticipantActiveTournament);

  return router;
}
