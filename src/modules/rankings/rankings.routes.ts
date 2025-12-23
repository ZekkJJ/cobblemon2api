/**
 * Rutas de Rankings
 * Cobblemon Los Pitufos - Backend API
 * 
 * Define las rutas HTTP para el módulo de rankings
 */

import { Router, Request, Response } from 'express';
import { StrongestPokemonService } from './strongest-pokemon.service.js';
import { getUsersCollection } from '../../config/database.js';
import { createRateLimiter } from '../../shared/utils/rate-limiter.js';

/**
 * Crea el router de rankings
 */
export async function createRankingsRouter(): Promise<Router> {
  const router = Router();

  // Obtener colección
  const usersCollection = await getUsersCollection();

  // Crear servicio
  const strongestPokemonService = new StrongestPokemonService(usersCollection);

  // Rate limiter para rankings
  const rankingLimiter = createRateLimiter({
    windowMs: 60000,
    max: 30,
    message: 'Demasiadas solicitudes de ranking, intenta de nuevo más tarde',
  });

  /**
   * GET /api/rankings/strongest-pokemon
   * Obtiene el ranking de los Pokémon más fuertes
   */
  router.get('/strongest-pokemon', rankingLimiter, async (req: Request, res: Response) => {
    try {
      const forceRefresh = req.query['refresh'] === 'true';
      const ranking = await strongestPokemonService.getStrongestPokemonRanking(forceRefresh);
      
      // Sanitizar datos antes de enviar (remover campos privados)
      const sanitizedRankings = ranking.rankings.map(r => ({
        rank: r.rank,
        ownerUsername: r.ownerUsername,
        ownerTotalPokemon: r.ownerTotalPokemon,
        powerScoreDisplay: r.powerScoreDisplay,
        realStats: r.realStats,
        calculatedAt: r.calculatedAt,
      }));

      res.json({
        success: true,
        data: {
          rankings: sanitizedRankings,
          totalAnalyzed: ranking.totalAnalyzed,
          totalPlayers: ranking.totalPlayers,
          lastCalculated: ranking.lastCalculated,
          nextUpdate: ranking.nextUpdate,
          grokAnalysis: ranking.grokMasterAnalysis,
          calculationPrecision: ranking.calculationPrecision,
          timeUntilNextUpdate: strongestPokemonService.getTimeUntilNextUpdate(),
        },
      });
    } catch (error) {
      console.error('[RANKINGS] Error obteniendo strongest pokemon:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener ranking de Pokémon más fuertes' 
      });
    }
  });

  /**
   * GET /api/rankings/next-update
   * Obtiene el tiempo hasta la próxima actualización
   */
  router.get('/next-update', rankingLimiter, async (req: Request, res: Response) => {
    try {
      const timeUntilUpdate = strongestPokemonService.getTimeUntilNextUpdate();
      res.json({
        success: true,
        data: timeUntilUpdate,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error al obtener tiempo de actualización' });
    }
  });

  return router;
}
