/**
 * Servicio de Torneos - Cobblemon Los Pitufos Backend API
 */

import { Collection, ObjectId } from 'mongodb';
import { Tournament } from '../../shared/types/tournament.types.js';
import { AppError, Errors } from '../../shared/middleware/error-handler.js';

export class TournamentsService {
  constructor(private tournamentsCollection: Collection<Tournament>) {}

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

  async createTournament(data: Partial<Tournament>, createdBy: string): Promise<Tournament> {
    try {
      const { title, description, startDate, maxParticipants, prizes } = data;

      if (!title || !startDate) {
        throw Errors.validationError('Título y fecha de inicio son requeridos');
      }

      const start = new Date(startDate);
      if (start < new Date()) {
        throw Errors.validationError('La fecha de inicio debe ser en el futuro');
      }

      const newTournament: Partial<Tournament> = {
        title,
        description: description || '',
        startDate,
        maxParticipants: maxParticipants || 32,
        prizes: prizes || '',
        status: 'upcoming',
        participants: [],
        winnerId: undefined,
        createdBy,
        createdAt: new Date(),
      };

      const result = await this.tournamentsCollection.insertOne(newTournament as Tournament);
      return { ...newTournament, _id: result.insertedId } as Tournament;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[TOURNAMENTS SERVICE] Error creando torneo:', error);
      throw Errors.databaseError();
    }
  }

  async updateTournament(id: string, data: Partial<Tournament>): Promise<Tournament> {
    try {
      await this.tournamentsCollection.updateOne({ _id: new ObjectId(id) }, { $set: data });
      return await this.getTournamentById(id);
    } catch (error) {
      console.error('[TOURNAMENTS SERVICE] Error actualizando torneo:', error);
      throw Errors.databaseError();
    }
  }

  async deleteTournament(id: string): Promise<{ success: boolean }> {
    try {
      await this.tournamentsCollection.deleteOne({ _id: new ObjectId(id) });
      return { success: true };
    } catch (error) {
      console.error('[TOURNAMENTS SERVICE] Error eliminando torneo:', error);
      throw Errors.databaseError();
    }
  }
}
