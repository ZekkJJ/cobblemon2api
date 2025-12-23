/**
 * Tipos de Torneos
 * Cobblemon Los Pitufos - Backend API
 * 
 * Define las interfaces y tipos relacionados con torneos.
 */

import { ObjectId } from 'mongodb';
import { z } from 'zod';

// ============================================
// TIPOS DE VICTORIA Y ESTADOS
// ============================================

/**
 * Tipos de victoria en un match
 */
export type VictoryType = 'KO' | 'FORFEIT' | 'TIMEOUT' | 'DRAW' | 'ADMIN_DECISION' | 'BYE';

/**
 * Estados de un match
 */
export type MatchStatus = 'pending' | 'ready' | 'active' | 'completed' | 'requires_admin';

/**
 * Estados de un participante
 */
export type ParticipantStatus = 'registered' | 'active' | 'eliminated' | 'winner';

/**
 * Estados de un torneo
 */
export type TournamentStatus = 'draft' | 'registration' | 'upcoming' | 'active' | 'completed' | 'cancelled';

// ============================================
// INTERFACES PRINCIPALES
// ============================================

/**
 * Participante de un torneo
 */
export interface TournamentParticipant {
  id: string;                    // ID interno único
  visitorId?: string;            // ID de visitante (legacy)
  username: string;              // Nombre de usuario de Minecraft
  discordId?: string;            // ID de Discord si está vinculado
  minecraftUuid: string;         // UUID de Minecraft (requerido)
  
  seed: number;                  // Posición de seeding
  status: ParticipantStatus;     // Estado del participante
  
  eliminated: boolean;           // Si está eliminado (legacy, usar status)
  eliminatedAt?: string;         // Fecha de eliminación
  eliminatedBy?: string;         // UUID del oponente que lo eliminó
  finalPlacement?: number;       // Posición final (1ro, 2do, etc.)
  
  registeredAt: string;          // Fecha de registro
}

/**
 * Match de un torneo
 */
export interface TournamentMatch {
  id: string;                    // ID único del match
  matchId?: string;              // Alias para compatibilidad
  tournamentId: string;          // ID del torneo
  
  // Posición en el bracket
  roundNumber: number;           // Número de ronda (1, 2, 3...)
  matchNumber: number;           // Posición dentro de la ronda
  bracketSide?: 'winners' | 'losers';  // Para eliminación doble
  position?: { x: number; y: number }; // Posición visual (legacy)
  
  // Participantes
  player1Id: string | null;      // null = bye o TBD
  player2Id: string | null;
  player1Score?: number;         // Puntuación (opcional)
  player2Score?: number;
  
  // Resultado
  winnerId: string | null;
  loserId: string | null;
  victoryType?: VictoryType;
  
  // Estado
  status: MatchStatus;
  isBye: boolean;                // Si es un bye automático
  
  // Tiempos
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  
  // Navegación del bracket
  nextMatchId: string | null;         // El ganador va aquí
  nextLoserMatchId?: string | null;   // Para eliminación doble
  
  // Metadatos
  adminOverride: boolean;        // Si el resultado fue forzado por admin
  adminId?: string;              // Admin que forzó el resultado
}

/**
 * Ronda de un torneo
 */
export interface TournamentRound {
  roundNumber: number;
  name: string;                  // "Ronda 1", "Cuartos", "Semifinal", "Final"
  matches: TournamentMatch[];
  isComplete: boolean;           // Si todos los matches están completados
}

/**
 * Estructura del bracket
 */
export interface BracketStructure {
  type: 'single' | 'double';
  rounds: TournamentRound[];
  currentRound: number;
  totalRounds: number;
  winnerId: string | null;
  losersRounds?: TournamentRound[];  // Para eliminación doble
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
  
  // Identificación
  code: string;                  // Código único de 6 caracteres (ej: "AX7F9B")
  name: string;
  title?: string;                // Alias para compatibilidad
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
  format?: string;               // ej: "6v6 Singles", "3v3 Doubles"
  
  // Estado
  status: TournamentStatus;
  currentRound: number;
  
  // Participantes y brackets
  participants: TournamentParticipant[];
  bracket: BracketStructure | null;
  rounds?: TournamentRound[];    // Legacy - usar bracket.rounds
  
  // Resultados
  winnerId?: string;
  winnerUsername?: string;
  prizes: string | TournamentPrize[];
  
  // Metadatos
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  version: number;               // Para optimistic locking
  
  // Imagen/banner opcional
  imageUrl?: string;
}

/**
 * Torneo público (para listados)
 */
export interface PublicTournament {
  _id?: ObjectId;
  code: string;                  // Código para inscripción
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
  bracketType: 'single' | 'double';
  format?: string;
}

/**
 * Datos para crear un torneo
 */
export interface CreateTournamentData {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  registrationDeadline?: string;
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
  registrationDeadline?: string;
  maxParticipants?: number;
  status?: Tournament['status'];
  prizes?: string;
  rules?: string;
  winnerId?: string;
  winnerUsername?: string;
  imageUrl?: string;
  currentRound?: number;
}

/**
 * Datos para registrar un participante
 */
export interface RegisterParticipantData {
  minecraftUuid: string;
  username: string;
  discordId?: string;
}

/**
 * Datos para resultado de match
 */
export interface MatchResultData {
  winnerId: string;
  loserId: string;
  victoryType: VictoryType;
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
  registrationDeadline: z.string().optional(),
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
  registrationDeadline: z.string().optional(),
  maxParticipants: z.number().int().min(2).max(256).optional(),
  status: z.enum(['draft', 'registration', 'upcoming', 'active', 'completed', 'cancelled']).optional(),
  prizes: z.string().max(1000).optional(),
  rules: z.string().max(5000).optional(),
  winnerId: z.string().optional(),
  winnerUsername: z.string().optional(),
  imageUrl: z.string().url().optional(),
  currentRound: z.number().int().min(0).optional(),
});

/**
 * Esquema para registrar participante
 */
export const RegisterParticipantSchema = z.object({
  minecraftUuid: z.string().min(1, 'UUID de Minecraft es requerido'),
  username: z.string().min(1, 'Nombre de usuario es requerido').max(16),
  discordId: z.string().optional(),
});

/**
 * Esquema para resultado de match
 */
export const MatchResultSchema = z.object({
  winnerId: z.string().min(1, 'ID del ganador es requerido'),
  loserId: z.string().min(1, 'ID del perdedor es requerido'),
  victoryType: z.enum(['KO', 'FORFEIT', 'TIMEOUT', 'DRAW', 'ADMIN_DECISION', 'BYE']),
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
    return currentStatus === 'registration' ? 'registration' : 'upcoming';
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
    code: tournament.code,
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
    bracketType: tournament.bracketType,
    format: tournament.format,
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
export function canRegister(tournament: Tournament): { canRegister: boolean; reason?: string } {
  if (tournament.status !== 'registration' && tournament.status !== 'upcoming' && tournament.status !== 'draft') {
    return { canRegister: false, reason: 'REGISTRATION_CLOSED' };
  }
  
  if (tournament.participants.length >= tournament.maxParticipants) {
    return { canRegister: false, reason: 'TOURNAMENT_FULL' };
  }
  
  if (tournament.registrationDeadline) {
    const deadline = new Date(tournament.registrationDeadline);
    if (new Date() > deadline) {
      return { canRegister: false, reason: 'DEADLINE_PASSED' };
    }
  }
  
  return { canRegister: true };
}

/**
 * Verifica si un jugador ya está registrado en un torneo
 */
export function isPlayerRegistered(tournament: Tournament, minecraftUuid: string): boolean {
  return tournament.participants.some(p => p.minecraftUuid === minecraftUuid);
}

/**
 * Crea un torneo por defecto
 */
export function createDefaultTournament(data: CreateTournamentData, createdBy: string, code: string): Omit<Tournament, '_id'> {
  return {
    code,
    name: data.name,
    title: data.name,
    description: data.description,
    startDate: data.startDate,
    endDate: data.endDate,
    registrationDeadline: data.registrationDeadline,
    maxParticipants: data.maxParticipants,
    minParticipants: data.minParticipants,
    bracketType: data.bracketType || 'single',
    format: data.format,
    status: 'registration',
    currentRound: 0,
    participants: [],
    bracket: null,
    rounds: [],
    prizes: data.prizes,
    rules: data.rules,
    imageUrl: data.imageUrl,
    createdBy,
    createdAt: new Date(),
    version: 1,
  };
}

/**
 * Crea un participante por defecto
 */
export function createDefaultParticipant(
  data: RegisterParticipantData, 
  seed: number
): TournamentParticipant {
  return {
    id: `${data.minecraftUuid}-${Date.now()}`,
    minecraftUuid: data.minecraftUuid,
    username: data.username,
    discordId: data.discordId,
    seed,
    status: 'registered',
    eliminated: false,
    registeredAt: new Date().toISOString(),
  };
}

/**
 * Obtiene el nombre de una ronda basado en el número total de rondas
 */
export function getRoundName(roundNumber: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - roundNumber;
  
  switch (roundsFromEnd) {
    case 0:
      return 'Final';
    case 1:
      return 'Semifinales';
    case 2:
      return 'Cuartos de Final';
    case 3:
      return 'Octavos de Final';
    default:
      return `Ronda ${roundNumber}`;
  }
}
