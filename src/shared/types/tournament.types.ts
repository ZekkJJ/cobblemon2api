/**
 * Tipos de Torneos
 * Cobblemon Los Pitufos - Backend API
 * 
 * Define las interfaces y tipos relacionados con torneos.
 */

import { ObjectId } from 'mongodb';
import { z } from 'zod';

// ============================================
// INTERFACES PRINCIPALES
// ============================================

/**
 * Participante de un torneo
 */
export interface TournamentParticipant {
  visitorId: string;
  username: string;
  discordId?: string;
  minecraftUuid?: string;
  seed: number;
  eliminated: boolean;
  eliminatedAt?: string;
  eliminatedBy?: string;
}

/**
 * Match de un torneo
 */
export interface TournamentMatch {
  matchId: string;
  roundNumber: number;
  position: { x: number; y: number };
  player1Id: string | null;
  player2Id: string | null;
  player1Score: number;
  player2Score: number;
  winnerId: string | null;
  isBye: boolean;
  status: 'pending' | 'active' | 'completed';
  nextMatchId: string | null;
  scheduledAt?: string;
  completedAt?: string;
}

/**
 * Ronda de un torneo
 */
export interface TournamentRound {
  roundNumber: number;
  name: string;
  matches: TournamentMatch[];
}

/**
 * Premio de un torneo
 */
export interface TournamentPrize {
  position: number;
  description: string;
  items?: string[];
  cobbleDollars?: number;
}

/**
 * Torneo completo
 */
export interface Tournament {
  _id?: ObjectId;
  name: string;
  title?: string; // Alias para compatibilidad
  description: string;
  rules?: string;
  
  // Fechas
  startDate: string;
  endDate?: string;
  registrationDeadline?: string;
  
  // Configuración
  maxParticipants: number;
  minParticipants?: number;
  bracketType: 'single' | 'double';
  format?: string; // ej: "6v6 Singles", "3v3 Doubles"
  
  // Estado
  status: 'draft' | 'upcoming' | 'active' | 'completed' | 'cancelled';
  
  // Participantes y brackets
  participants: TournamentParticipant[];
  rounds: TournamentRound[];
  
  // Resultados
  winnerId?: string;
  winnerUsername?: string;
  prizes: string | TournamentPrize[];
  
  // Metadatos
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  
  // Imagen/banner opcional
  imageUrl?: string;
}

/**
 * Torneo público (para listados)
 */
export interface PublicTournament {
  _id?: ObjectId;
  name: string;
  description: string;
  startDate: string;
  maxParticipants: number;
  currentParticipants: number;
  status: Tournament['status'];
  prizes: string | TournamentPrize[];
  winnerId?: string;
  winnerUsername?: string;
  imageUrl?: string;
}

/**
 * Datos para crear un torneo
 */
export interface CreateTournamentData {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  maxParticipants: number;
  minParticipants?: number;
  bracketType?: 'single' | 'double';
  format?: string;
  prizes: string;
  rules?: string;
  imageUrl?: string;
}

/**
 * Datos para actualizar un torneo
 */
export interface UpdateTournamentData {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  maxParticipants?: number;
  status?: Tournament['status'];
  prizes?: string;
  rules?: string;
  winnerId?: string;
  winnerUsername?: string;
  imageUrl?: string;
}

/**
 * Filtros para listar torneos
 */
export interface TournamentFilters {
  status?: Tournament['status'] | Tournament['status'][];
  createdBy?: string;
  fromDate?: string;
  toDate?: string;
}

// ============================================
// ESQUEMAS DE VALIDACIÓN ZOD
// ============================================

/**
 * Esquema para crear torneo
 */
export const CreateTournamentSchema = z.object({
  name: z.string().min(3, 'Nombre debe tener al menos 3 caracteres').max(100),
  description: z.string().min(10, 'Descripción debe tener al menos 10 caracteres').max(2000),
  startDate: z.string().refine(
    (date) => new Date(date) > new Date(),
    'La fecha de inicio debe ser en el futuro'
  ),
  endDate: z.string().optional(),
  maxParticipants: z.number().int().min(2, 'Mínimo 2 participantes').max(256, 'Máximo 256 participantes'),
  minParticipants: z.number().int().min(2).optional(),
  bracketType: z.enum(['single', 'double']).default('single'),
  format: z.string().max(100).optional(),
  prizes: z.string().min(1, 'Premios son requeridos').max(1000),
  rules: z.string().max(5000).optional(),
  imageUrl: z.string().url().optional(),
});

/**
 * Esquema para actualizar torneo
 */
export const UpdateTournamentSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().min(10).max(2000).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  maxParticipants: z.number().int().min(2).max(256).optional(),
  status: z.enum(['draft', 'upcoming', 'active', 'completed', 'cancelled']).optional(),
  prizes: z.string().max(1000).optional(),
  rules: z.string().max(5000).optional(),
  winnerId: z.string().optional(),
  winnerUsername: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

/**
 * Esquema para ID de torneo
 */
export const TournamentIdSchema = z.object({
  id: z.string().min(1, 'ID de torneo es requerido'),
});

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Determina el estado de un torneo basado en fechas
 */
export function determineTournamentStatus(
  startDate: string,
  endDate?: string,
  currentStatus?: Tournament['status']
): Tournament['status'] {
  // Si ya está completado o cancelado, mantener ese estado
  if (currentStatus === 'completed' || currentStatus === 'cancelled') {
    return currentStatus;
  }
  
  const now = new Date();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  
  if (now < start) {
    return 'upcoming';
  }
  
  if (end && now > end) {
    return 'completed';
  }
  
  return 'active';
}

/**
 * Convierte un Tournament a PublicTournament
 */
export function toPublicTournament(tournament: Tournament): PublicTournament {
  return {
    _id: tournament._id,
    name: tournament.name,
    description: tournament.description,
    startDate: tournament.startDate,
    maxParticipants: tournament.maxParticipants,
    currentParticipants: tournament.participants.length,
    status: tournament.status,
    prizes: tournament.prizes,
    winnerId: tournament.winnerId,
    winnerUsername: tournament.winnerUsername,
    imageUrl: tournament.imageUrl,
  };
}

/**
 * Agrupa torneos por estado
 */
export function groupTournamentsByStatus(tournaments: Tournament[]): {
  upcoming: Tournament[];
  active: Tournament[];
  completed: Tournament[];
} {
  return {
    upcoming: tournaments.filter(t => t.status === 'upcoming' || t.status === 'draft'),
    active: tournaments.filter(t => t.status === 'active'),
    completed: tournaments.filter(t => t.status === 'completed'),
  };
}

/**
 * Verifica si un torneo acepta inscripciones
 */
export function canRegister(tournament: Tournament): boolean {
  if (tournament.status !== 'upcoming' && tournament.status !== 'draft') {
    return false;
  }
  
  if (tournament.participants.length >= tournament.maxParticipants) {
    return false;
  }
  
  if (tournament.registrationDeadline) {
    const deadline = new Date(tournament.registrationDeadline);
    if (new Date() > deadline) {
      return false;
    }
  }
  
  return true;
}

/**
 * Crea un torneo por defecto
 */
export function createDefaultTournament(data: CreateTournamentData, createdBy: string): Omit<Tournament, '_id'> {
  return {
    name: data.name,
    title: data.name,
    description: data.description,
    startDate: data.startDate,
    endDate: data.endDate,
    maxParticipants: data.maxParticipants,
    minParticipants: data.minParticipants,
    bracketType: data.bracketType || 'single',
    format: data.format,
    status: 'upcoming',
    participants: [],
    rounds: [],
    prizes: data.prizes,
    rules: data.rules,
    imageUrl: data.imageUrl,
    createdBy,
    createdAt: new Date(),
  };
}
