/**
 * Utilidades de Serialización para Torneos
 * Cobblemon Los Pitufos - Backend API
 * 
 * Maneja la serialización y deserialización de objetos de torneo
 * para persistencia y transmisión.
 */

import { ObjectId } from 'mongodb';
import {
  Tournament,
  TournamentParticipant,
  TournamentMatch,
  TournamentRound,
  BracketStructure,
} from '../../shared/types/tournament.types.js';

/**
 * Interfaz para torneo serializado (JSON-safe)
 */
export interface SerializedTournament {
  _id?: string;
  code: string;
  name: string;
  title?: string;
  description: string;
  rules?: string;
  startDate: string;
  endDate?: string;
  registrationDeadline?: string;
  maxParticipants: number;
  minParticipants?: number;
  bracketType: 'single' | 'double';
  format?: string;
  status: Tournament['status'];
  currentRound: number;
  participants: TournamentParticipant[];
  bracket: BracketStructure | null;
  rounds?: TournamentRound[];
  winnerId?: string;
  winnerUsername?: string;
  prizes: string | any[];
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  version: number;
  imageUrl?: string;
}

/**
 * Serializa un torneo a formato JSON-safe
 */
export function serializeTournament(tournament: Tournament): SerializedTournament {
  return {
    _id: tournament._id?.toString(),
    code: tournament.code,
    name: tournament.name,
    title: tournament.title,
    description: tournament.description,
    rules: tournament.rules,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    registrationDeadline: tournament.registrationDeadline,
    maxParticipants: tournament.maxParticipants,
    minParticipants: tournament.minParticipants,
    bracketType: tournament.bracketType,
    format: tournament.format,
    status: tournament.status,
    currentRound: tournament.currentRound,
    participants: tournament.participants,
    bracket: tournament.bracket,
    rounds: tournament.rounds,
    winnerId: tournament.winnerId,
    winnerUsername: tournament.winnerUsername,
    prizes: tournament.prizes,
    createdBy: tournament.createdBy,
    createdAt: tournament.createdAt instanceof Date 
      ? tournament.createdAt.toISOString() 
      : tournament.createdAt,
    updatedAt: tournament.updatedAt instanceof Date 
      ? tournament.updatedAt.toISOString() 
      : tournament.updatedAt,
    version: tournament.version,
    imageUrl: tournament.imageUrl,
  };
}

/**
 * Deserializa un torneo desde formato JSON
 */
export function deserializeTournament(data: SerializedTournament): Tournament {
  return {
    _id: data._id ? new ObjectId(data._id) : undefined,
    code: data.code,
    name: data.name,
    title: data.title,
    description: data.description,
    rules: data.rules,
    startDate: data.startDate,
    endDate: data.endDate,
    registrationDeadline: data.registrationDeadline,
    maxParticipants: data.maxParticipants,
    minParticipants: data.minParticipants,
    bracketType: data.bracketType,
    format: data.format,
    status: data.status,
    currentRound: data.currentRound,
    participants: data.participants,
    bracket: data.bracket,
    rounds: data.rounds,
    winnerId: data.winnerId,
    winnerUsername: data.winnerUsername,
    prizes: data.prizes,
    createdBy: data.createdBy,
    createdAt: new Date(data.createdAt),
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
    version: data.version,
    imageUrl: data.imageUrl,
  };
}

/**
 * Convierte un torneo a JSON string
 */
export function tournamentToJSON(tournament: Tournament): string {
  return JSON.stringify(serializeTournament(tournament));
}

/**
 * Parsea un torneo desde JSON string
 */
export function tournamentFromJSON(json: string): Tournament {
  const data = JSON.parse(json) as SerializedTournament;
  return deserializeTournament(data);
}

/**
 * Serializa solo el bracket de un torneo
 */
export function serializeBracket(bracket: BracketStructure): string {
  return JSON.stringify(bracket);
}

/**
 * Deserializa un bracket desde JSON string
 */
export function deserializeBracket(json: string): BracketStructure {
  return JSON.parse(json) as BracketStructure;
}

/**
 * Verifica si dos torneos son equivalentes (ignorando _id y timestamps)
 */
export function areTournamentsEquivalent(t1: Tournament, t2: Tournament): boolean {
  const s1 = serializeTournament(t1);
  const s2 = serializeTournament(t2);
  
  // Ignorar campos que pueden diferir
  delete (s1 as any)._id;
  delete (s2 as any)._id;
  delete (s1 as any).createdAt;
  delete (s2 as any).createdAt;
  delete (s1 as any).updatedAt;
  delete (s2 as any).updatedAt;
  
  return JSON.stringify(s1) === JSON.stringify(s2);
}

/**
 * Crea una copia profunda de un torneo
 */
export function cloneTournament(tournament: Tournament): Tournament {
  return tournamentFromJSON(tournamentToJSON(tournament));
}

/**
 * Valida que un objeto tenga la estructura de un torneo válido
 */
export function isValidTournamentStructure(obj: any): obj is SerializedTournament {
  if (!obj || typeof obj !== 'object') return false;
  
  const requiredFields = [
    'code', 'name', 'description', 'startDate', 
    'maxParticipants', 'bracketType', 'status', 
    'participants', 'createdBy', 'version'
  ];
  
  for (const field of requiredFields) {
    if (!(field in obj)) return false;
  }
  
  if (typeof obj.code !== 'string' || obj.code.length !== 6) return false;
  if (typeof obj.maxParticipants !== 'number' || obj.maxParticipants < 2) return false;
  if (!['single', 'double'].includes(obj.bracketType)) return false;
  if (!Array.isArray(obj.participants)) return false;
  if (typeof obj.version !== 'number' || obj.version < 1) return false;
  
  return true;
}
