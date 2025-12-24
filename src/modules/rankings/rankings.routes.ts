/**
 * Rutas de Rankings
 * Cobblemon Los Pitufos - Backend API
 * 
 * Define las rutas HTTP para el módulo de rankings
 */

import { Router, Request, Response } from 'express';
import { StrongestPokemonService } from './strongest-pokemon.service.js';
import { TeamRankingService } from './team-ranking.service.js';
import { getUsersCollection, getLevelCapsCollection } from '../../config/database.js';
import { createRateLimiter } from '../../shared/utils/rate-limiter.js';

/**
 * Crea el router de rankings
 */
export async function createRankingsRouter(): Promise<Router> {
  const router = Router();

  // Obtener colecciones
  const usersCollection = await getUsersCollection();
  const levelCapsCollection = await getLevelCapsCollection();

  // Crear servicios con ambas colecciones
  const strongestPokemonService = new StrongestPokemonService(usersCollection, levelCapsCollection);
  const teamRankingService = new TeamRankingService(usersCollection, levelCapsCollection);

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
          currentLevelCap: ranking.currentLevelCap,
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
  router.get('/next-update', rankingLimiter, async (_req: Request, res: Response) => {
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

  /**
   * GET /api/rankings/team
   * Obtiene el ranking de equipos (mínimo 3 Pokémon en party)
   */
  router.get('/team', rankingLimiter, async (req: Request, res: Response) => {
    try {
      const forceRefresh = req.query['refresh'] === 'true';
      const ranking = await teamRankingService.getTeamRanking(forceRefresh);

      // Sanitizar datos antes de enviar
      const sanitizedRankings = ranking.rankings.map(r => ({
        rank: r.rank,
        ownerUsername: r.ownerUsername,
        teamSize: r.teamSize,
        totalScoreDisplay: r.totalScoreDisplay,
        scoreBreakdown: r.scoreBreakdown,
        teamAnalysis: {
          members: r.teamAnalysis.members,
          typeCoverage: r.teamAnalysis.typeCoverage,
          roleDistribution: r.teamAnalysis.roleDistribution,
          avgLevel: r.teamAnalysis.avgLevel,
          avgIvs: r.teamAnalysis.avgIvs,
          avgEvs: r.teamAnalysis.avgEvs,
          shinyCount: r.teamAnalysis.shinyCount,
        },
        synergyMetrics: r.synergyMetrics,
        calculatedAt: r.calculatedAt,
      }));

      res.json({
        success: true,
        data: {
          rankings: sanitizedRankings,
          totalTeamsAnalyzed: ranking.totalTeamsAnalyzed,
          totalPlayersChecked: ranking.totalPlayersChecked,
          lastCalculated: ranking.lastCalculated,
          nextUpdate: ranking.nextUpdate,
          grokAnalysis: ranking.grokMasterAnalysis,
          currentLevelCap: ranking.currentLevelCap,
          minimumTeamSize: ranking.minimumTeamSize,
          timeUntilNextUpdate: teamRankingService.getTimeUntilNextUpdate(),
        },
      });
    } catch (error) {
      console.error('[RANKINGS] Error obteniendo team ranking:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener ranking de equipos',
      });
    }
  });

  /**
   * GET /api/rankings/debug/:username
   * Debug: Muestra los datos de un usuario específico para verificar sincronización
   */
  router.get('/debug/:username', rankingLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
      const { username } = req.params;
      
      // Buscar usuario por username (case insensitive)
      const user = await usersCollection.findOne({
        minecraftUsername: { $regex: new RegExp(`^${username}$`, 'i') }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: `Usuario "${username}" no encontrado`,
          hint: 'Verifica que el nombre de usuario sea exacto'
        });
        return;
      }

      const party = user.pokemonParty || [];
      const pc = user.pcStorage || [];
      const pcPokemon = pc.flatMap(box => box.pokemon || []);

      res.json({
        success: true,
        data: {
          username: user.minecraftUsername,
          uuid: user.minecraftUuid,
          verified: user.verified,
          lastSync: user.syncedAt || user.minecraftLastSeen,
          pokemonCount: {
            party: party.length,
            pc: pcPokemon.length,
            total: party.length + pcPokemon.length
          },
          party: party.map(p => ({
            species: p?.species || 'Unknown',
            level: p?.level || 0,
            hasIvs: !!p?.ivs,
            hasEvs: !!p?.evs,
            shiny: p?.shiny || false
          })),
          pcBoxes: pc.map((box, i) => ({
            boxNumber: i,
            pokemonCount: box.pokemon?.length || 0
          }))
        }
      });
    } catch (error) {
      console.error('[RANKINGS DEBUG] Error:', error);
      res.status(500).json({ success: false, error: 'Error al obtener datos de debug' });
    }
  });

  return router;
}
