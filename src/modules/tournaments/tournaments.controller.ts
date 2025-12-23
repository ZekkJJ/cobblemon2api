/**
 * Controlador de Torneos - Cobblemon Los Pitufos Backend API
 * Maneja todas las peticiones HTTP relacionadas con torneos.
 */

import { Request, Response } from 'express';
import { TournamentsService } from './tournaments.service.js';
import { asyncHandler, AppError, ErrorCode } from '../../shared/middleware/error-handler.js';
import { 
  CreateTournamentSchema, 
  UpdateTournamentSchema,
  RegisterParticipantSchema,
  MatchResultSchema,
} from '../../shared/types/tournament.types.js';

export class TournamentsController {
  constructor(private tournamentsService: TournamentsService) {}

  // ============================================
  // CRUD BÁSICO
  // ============================================

  getAllTournaments = asyncHandler(async (_req: Request, res: Response) => {
    const tournaments = await this.tournamentsService.getAllTournaments();
    res.json({
      success: true,
      data: tournaments,
      count: tournaments.length,
    });
  });

  getActiveTournaments = asyncHandler(async (_req: Request, res: Response) => {
    const tournaments = await this.tournamentsService.getActiveTournaments();
    res.json({
      success: true,
      data: tournaments,
      count: tournaments.length,
    });
  });

  getTournamentById = asyncHandler(async (req: Request, res: Response) => {
    const tournament = await this.tournamentsService.getTournamentById(req.params['id'] ?? '');
    res.json({
      success: true,
      data: tournament,
    });
  });

  getTournamentByCode = asyncHandler(async (req: Request, res: Response) => {
    const code = req.params['code'] ?? '';
    const tournament = await this.tournamentsService.getTournamentByCode(code);
    
    if (!tournament) {
      throw new AppError('Torneo no encontrado con ese código', 404, ErrorCode.TOURNAMENT_NOT_FOUND);
    }
    
    res.json({
      success: true,
      data: tournament,
    });
  });

  createTournament = asyncHandler(async (req: Request, res: Response) => {
    const validationResult = CreateTournamentSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        validationResult.error.errors[0]?.message || 'Error de validación', 
        400, 
        ErrorCode.VALIDATION_ERROR
      );
    }

    const createdBy = (req as any).user?.discordUsername || 'Admin';
    const tournament = await this.tournamentsService.createTournament(validationResult.data, createdBy);
    
    res.status(201).json({
      success: true,
      data: tournament,
      message: `Torneo creado con código: ${tournament.code}`,
    });
  });

  updateTournament = asyncHandler(async (req: Request, res: Response) => {
    const validationResult = UpdateTournamentSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        validationResult.error.errors[0]?.message || 'Error de validación', 
        400, 
        ErrorCode.VALIDATION_ERROR
      );
    }

    const expectedVersion = req.body.version ? parseInt(String(req.body.version), 10) : undefined;
    const tournament = await this.tournamentsService.updateTournament(
      req.params['id'] ?? '', 
      validationResult.data,
      expectedVersion
    );
    
    res.json({
      success: true,
      data: tournament,
    });
  });

  deleteTournament = asyncHandler(async (req: Request, res: Response) => {
    await this.tournamentsService.deleteTournament(req.params['id'] ?? '');
    res.json({
      success: true,
      message: 'Torneo eliminado',
    });
  });

  // ============================================
  // GESTIÓN DE TORNEOS
  // ============================================

  startTournament = asyncHandler(async (req: Request, res: Response) => {
    const tournament = await this.tournamentsService.startTournament(req.params['id'] ?? '');
    res.json({
      success: true,
      data: tournament,
      message: 'Torneo iniciado correctamente',
    });
  });

  cancelTournament = asyncHandler(async (req: Request, res: Response) => {
    const tournament = await this.tournamentsService.cancelTournament(req.params['id'] ?? '');
    res.json({
      success: true,
      data: tournament,
      message: 'Torneo cancelado',
    });
  });

  reorderParticipants = asyncHandler(async (req: Request, res: Response) => {
    const { newOrder } = req.body;
    
    if (!Array.isArray(newOrder)) {
      throw new AppError('newOrder debe ser un array de IDs de participantes', 400, ErrorCode.VALIDATION_ERROR);
    }

    const tournament = await this.tournamentsService.reorderParticipants(
      req.params['id'] ?? '',
      newOrder
    );
    
    res.json({
      success: true,
      data: tournament,
      message: 'Participantes reordenados',
    });
  });


  // ============================================
  // REGISTRO DE PARTICIPANTES
  // ============================================

  registerParticipant = asyncHandler(async (req: Request, res: Response) => {
    const validationResult = RegisterParticipantSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        validationResult.error.errors[0]?.message || 'Error de validación', 
        400, 
        ErrorCode.VALIDATION_ERROR
      );
    }

    const { participant, tournament } = await this.tournamentsService.registerParticipant(
      req.params['id'] ?? '',
      validationResult.data
    );
    
    res.status(201).json({
      success: true,
      data: { participant, tournament },
      message: `${participant.username} inscrito en ${tournament.name}`,
    });
  });

  registerParticipantByCode = asyncHandler(async (req: Request, res: Response) => {
    const { code, ...participantData } = req.body;
    
    if (!code) {
      throw new AppError('Código de torneo es requerido', 400, ErrorCode.VALIDATION_ERROR);
    }

    const validationResult = RegisterParticipantSchema.safeParse(participantData);
    if (!validationResult.success) {
      throw new AppError(
        validationResult.error.errors[0]?.message || 'Error de validación', 
        400, 
        ErrorCode.VALIDATION_ERROR
      );
    }

    const { participant, tournament } = await this.tournamentsService.registerParticipantByCode(
      code,
      validationResult.data
    );
    
    res.status(201).json({
      success: true,
      data: { participant, tournament },
      message: `${participant.username} inscrito en ${tournament.name}`,
    });
  });

  removeParticipant = asyncHandler(async (req: Request, res: Response) => {
    const tournament = await this.tournamentsService.removeParticipant(
      req.params['id'] ?? '',
      req.params['participantId'] ?? ''
    );
    
    res.json({
      success: true,
      data: tournament,
      message: 'Participante removido',
    });
  });

  // ============================================
  // GESTIÓN DE MATCHES
  // ============================================

  recordMatchResult = asyncHandler(async (req: Request, res: Response) => {
    const validationResult = MatchResultSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        validationResult.error.errors[0]?.message || 'Error de validación', 
        400, 
        ErrorCode.VALIDATION_ERROR
      );
    }

    const { tournament, match } = await this.tournamentsService.recordMatchResult(
      req.params['matchId'] ?? '',
      validationResult.data,
      req.body.tournamentId
    );
    
    res.json({
      success: true,
      data: { tournament, match },
      message: 'Resultado registrado',
    });
  });

  forceMatchResult = asyncHandler(async (req: Request, res: Response) => {
    const { winnerId, tournamentId } = req.body;
    
    if (!winnerId) {
      throw new AppError('winnerId es requerido', 400, ErrorCode.VALIDATION_ERROR);
    }

    const adminId = (req as any).user?.discordId || 'admin';
    
    const { tournament, match } = await this.tournamentsService.forceMatchResult(
      req.params['matchId'] ?? '',
      winnerId,
      adminId,
      tournamentId
    );
    
    res.json({
      success: true,
      data: { tournament, match },
      message: 'Resultado forzado por administrador',
    });
  });

  findMatchByParticipants = asyncHandler(async (req: Request, res: Response) => {
    const { player1Uuid, player2Uuid } = req.body;
    
    if (!player1Uuid || !player2Uuid) {
      throw new AppError('player1Uuid y player2Uuid son requeridos', 400, ErrorCode.VALIDATION_ERROR);
    }

    const result = await this.tournamentsService.findMatchByParticipants(player1Uuid, player2Uuid);
    
    if (!result) {
      res.json({
        success: true,
        data: null,
        message: 'No se encontró match activo entre estos jugadores',
      });
      return;
    }
    
    res.json({
      success: true,
      data: result,
    });
  });

  getParticipantActiveTournament = asyncHandler(async (req: Request, res: Response) => {
    const tournament = await this.tournamentsService.getParticipantActiveTournament(
      req.params['uuid'] ?? ''
    );
    
    res.json({
      success: true,
      data: tournament,
    });
  });
}
