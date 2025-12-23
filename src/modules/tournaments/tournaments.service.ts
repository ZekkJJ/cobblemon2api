/**
 * Servicio de Torneos - Cobblemon Los Pitufos Backend API
 * Sistema completo de gestión de torneos con brackets y códigos únicos.
 */

import { Collection, ObjectId } from 'mongodb';
import { 
  Tournament, 
  TournamentParticipant,
  TournamentMatch,
  CreateTournamentData,
  UpdateTournamentData,
  RegisterParticipantData,
  MatchResultData,
  canRegister,
  isPlayerRegistered,
  createDefaultTournament,
  createDefaultParticipant,
} from '../../shared/types/tournament.types.js';
import { AppError, Errors, ErrorCode } from '../../shared/middleware/error-handler.js';
import { generateUniqueTournamentCodeAsync, normalizeTournamentCode } from '../../shared/utils/tournament-code.js';
import { BracketEngine } from './bracket-engine.js';
import { getWebSocketService } from './websocket.service.js';

export class TournamentsService {
  private bracketEngine: BracketEngine;

  constructor(private tournamentsCollection: Collection<Tournament>) {
    this.bracketEngine = new BracketEngine();
  }

  // ============================================
  // CRUD BÁSICO
  // ============================================

  async getAllTournaments(): Promise<Tournament[]> {
    try {
      const tournaments = await this.tournamentsCollection.find({}).toArray();
      tournaments.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      return tournaments;
    } catch (error) {
      console.error('[TOURNAMENTS SERVICE] Error obteniendo torneos:', error);
      throw Errors.databaseError();
    }
  }

  async getActiveTournaments(): Promise<Tournament[]> {
    try {
      const tournaments = await this.tournamentsCollection.find({
        status: { $in: ['registration', 'upcoming', 'active'] }
      }).toArray();
      tournaments.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      return tournaments;
    } catch (error) {
      console.error('[TOURNAMENTS SERVICE] Error obteniendo torneos activos:', error);
      throw Errors.databaseError();
    }
  }

  async getTournamentById(id: string): Promise<Tournament> {
    try {
      const tournament = await this.tournamentsCollection.findOne({ _id: new ObjectId(id) });
      if (!tournament) {
        throw Errors.tournamentNotFound();
      }
      return tournament;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[TOURNAMENTS SERVICE] Error obteniendo torneo:', error);
      throw Errors.databaseError();
    }
  }

  async getTournamentByCode(code: string): Promise<Tournament | null> {
    try {
      const normalizedCode = normalizeTournamentCode(code);
      if (!normalizedCode) {
        return null;
      }
      return await this.tournamentsCollection.findOne({ code: normalizedCode });
    } catch (error) {
      console.error('[TOURNAMENTS SERVICE] Error obteniendo torneo por código:', error);
      throw Errors.databaseError();
    }
  }


  async createTournament(data: CreateTournamentData, createdBy: string): Promise<Tournament> {
    try {
      // Validar datos básicos
      if (!data.name || !data.startDate) {
        throw Errors.validationError('Nombre y fecha de inicio son requeridos');
      }

      const start = new Date(data.startDate);
      if (start < new Date()) {
        throw Errors.validationError('La fecha de inicio debe ser en el futuro');
      }

      // Generar código único
      const code = await generateUniqueTournamentCodeAsync(async (testCode) => {
        const existing = await this.tournamentsCollection.findOne({ code: testCode });
        return existing !== null;
      });

      // Crear torneo con código
      const newTournament = createDefaultTournament(data, createdBy, code);

      const result = await this.tournamentsCollection.insertOne(newTournament as Tournament);
      const createdTournament = { ...newTournament, _id: result.insertedId } as Tournament;

      console.log(`[TOURNAMENTS] Torneo creado: ${createdTournament.name} (Código: ${code})`);
      
      return createdTournament;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[TOURNAMENTS SERVICE] Error creando torneo:', error);
      throw Errors.databaseError();
    }
  }

  async updateTournament(id: string, data: UpdateTournamentData, expectedVersion?: number): Promise<Tournament> {
    try {
      const tournament = await this.getTournamentById(id);

      // Verificar versión para optimistic locking
      if (expectedVersion !== undefined && tournament.version !== expectedVersion) {
        throw new AppError(
          `Conflicto de versión. Versión actual: ${tournament.version}`,
          409,
          ErrorCode.VERSION_CONFLICT
        );
      }

      const updateData = {
        ...data,
        updatedAt: new Date(),
        version: tournament.version + 1,
      };

      await this.tournamentsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      return await this.getTournamentById(id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[TOURNAMENTS SERVICE] Error actualizando torneo:', error);
      throw Errors.databaseError();
    }
  }

  async deleteTournament(id: string): Promise<{ success: boolean }> {
    try {
      const result = await this.tournamentsCollection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        throw Errors.tournamentNotFound();
      }
      return { success: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[TOURNAMENTS SERVICE] Error eliminando torneo:', error);
      throw Errors.databaseError();
    }
  }

  // ============================================
  // REGISTRO DE PARTICIPANTES
  // ============================================

  async registerParticipant(
    tournamentId: string, 
    data: RegisterParticipantData
  ): Promise<{ participant: TournamentParticipant; tournament: Tournament }> {
    try {
      const tournament = await this.getTournamentById(tournamentId);

      // Verificar si puede registrarse
      const registrationCheck = canRegister(tournament);
      if (!registrationCheck.canRegister) {
        switch (registrationCheck.reason) {
          case 'REGISTRATION_CLOSED':
            throw new AppError('Las inscripciones están cerradas', 400, ErrorCode.REGISTRATION_CLOSED);
          case 'TOURNAMENT_FULL':
            throw new AppError('El torneo está lleno', 400, ErrorCode.TOURNAMENT_FULL);
          case 'DEADLINE_PASSED':
            throw new AppError('La fecha límite de inscripción ha pasado', 400, ErrorCode.VALIDATION_ERROR);
          default:
            throw new AppError('No se puede registrar en este torneo', 400, ErrorCode.VALIDATION_ERROR);
        }
      }

      // Verificar si ya está registrado
      if (isPlayerRegistered(tournament, data.minecraftUuid)) {
        throw new AppError('Ya estás inscrito en este torneo', 409, ErrorCode.ALREADY_REGISTERED);
      }

      // Crear participante
      const seed = tournament.participants.length + 1;
      const participant = createDefaultParticipant(data, seed);

      // Actualizar torneo
      await this.tournamentsCollection.updateOne(
        { _id: new ObjectId(tournamentId) },
        { 
          $push: { participants: participant },
          $set: { updatedAt: new Date() },
          $inc: { version: 1 }
        }
      );

      const updatedTournament = await this.getTournamentById(tournamentId);

      console.log(`[TOURNAMENTS] Participante registrado: ${data.username} en ${tournament.name}`);

      // Broadcast WebSocket
      try {
        const wsService = getWebSocketService();
        wsService.broadcastParticipantJoined(tournamentId, participant);
      } catch (wsError) {
        console.warn('[TOURNAMENTS] Error broadcasting participant joined:', wsError);
      }

      return { participant, tournament: updatedTournament };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[TOURNAMENTS SERVICE] Error registrando participante:', error);
      throw Errors.databaseError();
    }
  }

  async registerParticipantByCode(
    code: string, 
    data: RegisterParticipantData
  ): Promise<{ participant: TournamentParticipant; tournament: Tournament }> {
    const tournament = await this.getTournamentByCode(code);
    if (!tournament) {
      throw new AppError('Código de torneo inválido', 400, ErrorCode.INVALID_CODE);
    }
    return this.registerParticipant(tournament._id!.toString(), data);
  }

  async removeParticipant(tournamentId: string, participantId: string): Promise<Tournament> {
    try {
      const tournament = await this.getTournamentById(tournamentId);

      const participantIndex = tournament.participants.findIndex(p => p.id === participantId);
      if (participantIndex === -1) {
        throw new AppError('Participante no encontrado', 404, ErrorCode.NOT_FOUND);
      }

      const participant = tournament.participants[participantIndex];
      if (!participant) {
        throw new AppError('Participante no encontrado', 404, ErrorCode.NOT_FOUND);
      }

      // Si el torneo está activo, marcar como eliminado y actualizar bracket
      if (tournament.status === 'active' && tournament.bracket) {
        // Marcar participante como eliminado
        const updatedParticipant = {
          ...participant,
          status: 'eliminated' as const,
          eliminated: true,
          eliminatedAt: new Date().toISOString(),
        };

        // Actualizar bracket - avanzar al oponente
        const updatedBracket = this.bracketEngine.handleParticipantRemoval(
          tournament.bracket,
          participantId
        );

        await this.tournamentsCollection.updateOne(
          { _id: new ObjectId(tournamentId) },
          { 
            $set: { 
              [`participants.${String(participantIndex)}`]: updatedParticipant,
              bracket: updatedBracket,
              updatedAt: new Date()
            },
            $inc: { version: 1 }
          }
        );
      } else {
        // Si no está activo, simplemente remover
        await this.tournamentsCollection.updateOne(
          { _id: new ObjectId(tournamentId) },
          { 
            $pull: { participants: { id: participantId } },
            $set: { updatedAt: new Date() },
            $inc: { version: 1 }
          }
        );
      }

      console.log(`[TOURNAMENTS] Participante removido: ${participant.username} de ${tournament.name}`);

      // Broadcast WebSocket
      try {
        const wsService = getWebSocketService();
        wsService.broadcastParticipantLeft(tournamentId, participantId);
      } catch (wsError) {
        console.warn('[TOURNAMENTS] Error broadcasting participant left:', wsError);
      }

      return await this.getTournamentById(tournamentId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[TOURNAMENTS SERVICE] Error removiendo participante:', error);
      throw Errors.databaseError();
    }
  }


  // ============================================
  // GESTIÓN DE MATCHES
  // ============================================

  async startTournament(tournamentId: string): Promise<Tournament> {
    try {
      const tournament = await this.getTournamentById(tournamentId);

      if (tournament.status === 'active') {
        throw new AppError('El torneo ya está activo', 400, ErrorCode.VALIDATION_ERROR);
      }

      if (tournament.participants.length < 2) {
        throw new AppError('Se necesitan al menos 2 participantes', 400, ErrorCode.VALIDATION_ERROR);
      }

      // Generar bracket
      const bracket = this.bracketEngine.generateBracket(
        tournament.participants,
        tournament.bracketType
      );

      // Actualizar estado de participantes a activo
      const updatedParticipants = tournament.participants.map(p => ({
        ...p,
        status: 'active' as const
      }));

      await this.tournamentsCollection.updateOne(
        { _id: new ObjectId(tournamentId) },
        { 
          $set: { 
            status: 'active',
            bracket,
            participants: updatedParticipants,
            currentRound: 1,
            updatedAt: new Date()
          },
          $inc: { version: 1 }
        }
      );

      console.log(`[TOURNAMENTS] Torneo iniciado: ${tournament.name} con ${tournament.participants.length} participantes`);

      const startedTournament = await this.getTournamentById(tournamentId);

      // Broadcast WebSocket
      try {
        const wsService = getWebSocketService();
        wsService.broadcastTournamentStarted(startedTournament);
      } catch (wsError) {
        console.warn('[TOURNAMENTS] Error broadcasting tournament started:', wsError);
      }

      return startedTournament;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[TOURNAMENTS SERVICE] Error iniciando torneo:', error);
      throw Errors.databaseError();
    }
  }

  async findMatchByParticipants(
    player1Uuid: string, 
    player2Uuid: string
  ): Promise<{ tournament: Tournament; match: TournamentMatch } | null> {
    try {
      // Buscar torneos activos
      const activeTournaments = await this.tournamentsCollection.find({
        status: 'active',
        'participants.minecraftUuid': { $all: [player1Uuid, player2Uuid] }
      }).toArray();

      for (const tournament of activeTournaments) {
        if (!tournament.bracket) continue;

        // Buscar participantes
        const p1 = tournament.participants.find(p => p.minecraftUuid === player1Uuid);
        const p2 = tournament.participants.find(p => p.minecraftUuid === player2Uuid);

        if (!p1 || !p2) continue;

        // Buscar match activo entre estos participantes
        const match = this.bracketEngine.findActiveMatchBetween(
          tournament.bracket,
          p1.id,
          p2.id
        );

        if (match) {
          return { tournament, match };
        }
      }

      return null;
    } catch (error) {
      console.error('[TOURNAMENTS SERVICE] Error buscando match:', error);
      throw Errors.databaseError();
    }
  }

  async recordMatchResult(
    matchId: string,
    result: MatchResultData,
    tournamentId?: string
  ): Promise<{ tournament: Tournament; match: TournamentMatch }> {
    try {
      // Si no se proporciona tournamentId, buscar el torneo que contiene el match
      let tournament: Tournament;
      
      if (tournamentId) {
        tournament = await this.getTournamentById(tournamentId);
      } else {
        const found = await this.tournamentsCollection.findOne({
          status: 'active',
          'bracket.rounds.matches.id': matchId
        });
        if (!found) {
          throw new AppError('Match no encontrado', 404, ErrorCode.NOT_FOUND);
        }
        tournament = found;
      }

      if (!tournament.bracket) {
        throw new AppError('El torneo no tiene bracket generado', 400, ErrorCode.VALIDATION_ERROR);
      }

      // Manejar empate
      if (result.victoryType === 'DRAW') {
        const updatedBracket = this.bracketEngine.markMatchAsRequiresAdmin(
          tournament.bracket,
          matchId
        );

        await this.tournamentsCollection.updateOne(
          { _id: tournament._id },
          { 
            $set: { bracket: updatedBracket, updatedAt: new Date() },
            $inc: { version: 1 }
          }
        );

        const updatedTournament = await this.getTournamentById(tournament._id!.toString());
        const match = this.bracketEngine.findMatchById(updatedBracket, matchId)!;
        
        return { tournament: updatedTournament, match };
      }

      // Actualizar bracket con resultado
      const updatedBracket = this.bracketEngine.advanceWinner(
        tournament.bracket,
        matchId,
        result.winnerId,
        result.loserId,
        result.victoryType
      );

      // Actualizar participantes
      const updatedParticipants = tournament.participants.map(p => {
        if (p.id === result.loserId) {
          return {
            ...p,
            status: 'eliminated' as const,
            eliminated: true,
            eliminatedAt: new Date().toISOString(),
            eliminatedBy: result.winnerId
          };
        }
        return p;
      });

      // Verificar si el torneo terminó
      const isComplete = updatedBracket.winnerId !== null;
      const winner = isComplete 
        ? tournament.participants.find(p => p.id === updatedBracket.winnerId)
        : null;

      await this.tournamentsCollection.updateOne(
        { _id: tournament._id },
        { 
          $set: { 
            bracket: updatedBracket,
            participants: updatedParticipants,
            currentRound: updatedBracket.currentRound,
            ...(isComplete && {
              status: 'completed',
              winnerId: winner?.id,
              winnerUsername: winner?.username
            }),
            updatedAt: new Date()
          },
          $inc: { version: 1 }
        }
      );

      const updatedTournament = await this.getTournamentById(tournament._id!.toString());
      const match = this.bracketEngine.findMatchById(updatedBracket, matchId)!;

      console.log(`[TOURNAMENTS] Match completado en ${tournament.name}: ${result.winnerId} ganó`);

      // Broadcast WebSocket
      try {
        const wsService = getWebSocketService();
        wsService.broadcastMatchCompleted(tournament._id!.toString(), match);
        
        // Si el torneo terminó, broadcast de torneo completado
        if (isComplete) {
          wsService.broadcastTournamentCompleted(updatedTournament);
        }
        
        // Verificar si la ronda está completa
        const currentRound = updatedBracket.rounds.find(
          (r: { roundNumber: number }) => r.roundNumber === updatedBracket.currentRound
        );
        if (currentRound?.isComplete) {
          wsService.broadcastRoundCompleted(tournament._id!.toString(), currentRound.roundNumber);
        }
      } catch (wsError) {
        console.warn('[TOURNAMENTS] Error broadcasting match result:', wsError);
      }

      return { tournament: updatedTournament, match };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[TOURNAMENTS SERVICE] Error registrando resultado:', error);
      throw Errors.databaseError();
    }
  }

  async forceMatchResult(
    matchId: string,
    winnerId: string,
    adminId: string,
    tournamentId?: string
  ): Promise<{ tournament: Tournament; match: TournamentMatch }> {
    try {
      let tournament: Tournament;
      
      if (tournamentId) {
        tournament = await this.getTournamentById(tournamentId);
      } else {
        const found = await this.tournamentsCollection.findOne({
          'bracket.rounds.matches.id': matchId
        });
        if (!found) {
          throw new AppError('Match no encontrado', 404, ErrorCode.NOT_FOUND);
        }
        tournament = found;
      }

      if (!tournament.bracket) {
        throw new AppError('El torneo no tiene bracket generado', 400, ErrorCode.VALIDATION_ERROR);
      }

      // Encontrar el match para obtener el perdedor
      const match = this.bracketEngine.findMatchById(tournament.bracket, matchId);
      if (!match) {
        throw new AppError('Match no encontrado', 404, ErrorCode.NOT_FOUND);
      }

      const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;
      if (!loserId) {
        throw new AppError('Match inválido para forzar resultado', 400, ErrorCode.VALIDATION_ERROR);
      }

      // Actualizar bracket con resultado forzado
      const updatedBracket = this.bracketEngine.advanceWinner(
        tournament.bracket,
        matchId,
        winnerId,
        loserId,
        'ADMIN_DECISION',
        true,
        adminId
      );

      // Actualizar participantes
      const updatedParticipants = tournament.participants.map(p => {
        if (p.id === loserId) {
          return {
            ...p,
            status: 'eliminated' as const,
            eliminated: true,
            eliminatedAt: new Date().toISOString(),
            eliminatedBy: winnerId
          };
        }
        return p;
      });

      // Verificar si el torneo terminó
      const isComplete = updatedBracket.winnerId !== null;
      const winner = isComplete 
        ? tournament.participants.find(p => p.id === updatedBracket.winnerId)
        : null;

      await this.tournamentsCollection.updateOne(
        { _id: tournament._id },
        { 
          $set: { 
            bracket: updatedBracket,
            participants: updatedParticipants,
            currentRound: updatedBracket.currentRound,
            ...(isComplete && {
              status: 'completed',
              winnerId: winner?.id,
              winnerUsername: winner?.username
            }),
            updatedAt: new Date()
          },
          $inc: { version: 1 }
        }
      );

      const updatedTournament = await this.getTournamentById(tournament._id!.toString());
      const updatedMatch = this.bracketEngine.findMatchById(updatedBracket, matchId)!;

      console.log(`[TOURNAMENTS] Match forzado por admin ${adminId} en ${tournament.name}`);

      // Broadcast WebSocket
      try {
        const wsService = getWebSocketService();
        wsService.broadcastMatchCompleted(tournament._id!.toString(), updatedMatch);
        
        // Si el torneo terminó, broadcast de torneo completado
        if (isComplete) {
          wsService.broadcastTournamentCompleted(updatedTournament);
        }
      } catch (wsError) {
        console.warn('[TOURNAMENTS] Error broadcasting forced match result:', wsError);
      }

      return { tournament: updatedTournament, match: updatedMatch };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[TOURNAMENTS SERVICE] Error forzando resultado:', error);
      throw Errors.databaseError();
    }
  }

  // ============================================
  // CONSULTAS ADICIONALES
  // ============================================

  async getParticipantActiveTournament(playerUuid: string): Promise<Tournament | null> {
    try {
      return await this.tournamentsCollection.findOne({
        status: { $in: ['registration', 'active'] },
        'participants.minecraftUuid': playerUuid,
        'participants.status': { $ne: 'eliminated' }
      });
    } catch (error) {
      console.error('[TOURNAMENTS SERVICE] Error buscando torneo del jugador:', error);
      throw Errors.databaseError();
    }
  }

  async cancelTournament(tournamentId: string): Promise<Tournament> {
    try {
      const tournament = await this.getTournamentById(tournamentId);

      if (tournament.status === 'completed' || tournament.status === 'cancelled') {
        throw new AppError('El torneo ya está finalizado o cancelado', 400, ErrorCode.VALIDATION_ERROR);
      }

      await this.tournamentsCollection.updateOne(
        { _id: new ObjectId(tournamentId) },
        { 
          $set: { 
            status: 'cancelled',
            updatedAt: new Date()
          },
          $inc: { version: 1 }
        }
      );

      console.log(`[TOURNAMENTS] Torneo cancelado: ${tournament.name}`);

      // Broadcast WebSocket
      try {
        const wsService = getWebSocketService();
        wsService.broadcastTournamentCancelled(tournamentId);
      } catch (wsError) {
        console.warn('[TOURNAMENTS] Error broadcasting tournament cancelled:', wsError);
      }

      return await this.getTournamentById(tournamentId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[TOURNAMENTS SERVICE] Error cancelando torneo:', error);
      throw Errors.databaseError();
    }
  }

  async reorderParticipants(tournamentId: string, newOrder: string[]): Promise<Tournament> {
    try {
      const tournament = await this.getTournamentById(tournamentId);

      if (tournament.status === 'active') {
        throw new AppError('No se puede reordenar durante un torneo activo', 400, ErrorCode.VALIDATION_ERROR);
      }

      // Reordenar participantes según el nuevo orden
      const reorderedParticipants = newOrder.map((participantId, index) => {
        const participant = tournament.participants.find(p => p.id === participantId);
        if (!participant) {
          throw new AppError(`Participante ${participantId} no encontrado`, 400, ErrorCode.VALIDATION_ERROR);
        }
        return { ...participant, seed: index + 1 };
      });

      await this.tournamentsCollection.updateOne(
        { _id: new ObjectId(tournamentId) },
        { 
          $set: { 
            participants: reorderedParticipants,
            updatedAt: new Date()
          },
          $inc: { version: 1 }
        }
      );

      return await this.getTournamentById(tournamentId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[TOURNAMENTS SERVICE] Error reordenando participantes:', error);
      throw Errors.databaseError();
    }
  }
}
