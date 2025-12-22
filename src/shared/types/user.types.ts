/**
 * Tipos de Usuario
 * Cobblemon Los Pitufos - Backend API
 * 
 * Define las interfaces y tipos relacionados con usuarios/jugadores.
 */

import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { PCBox, Pokemon } from './pokemon.types.js';

// Re-exportar tipos de Pokemon desde pokemon.types
export type { Pokemon, PCBox, PokemonStats, PokemonMove } from './pokemon.types.js';

// ============================================
// INTERFACES PRINCIPALES
// ============================================

/**
 * Usuario completo de la base de datos
 */
export interface User {
  _id?: ObjectId;
  
  // Discord
  discordId: string | null;
  discordUsername: string;
  discordAvatar?: string;
  nickname: string;
  
  // Minecraft
  minecraftUuid?: string;
  minecraftUsername?: string;
  minecraftOnline?: boolean;
  minecraftLastSeen?: string;
  
  // Verificación
  verified: boolean;
  verifiedAt?: string;
  verificationCode?: string;
  lastVerificationCode?: string;
  
  // Starter (Gacha)
  starterId: number | null;
  starterIsShiny: boolean;
  starterGiven: boolean;
  starterGivenAt?: string;
  rolledAt: string | null;
  starterDeliveryInProgress?: boolean;
  starterDeliveryAttempts?: number;
  lastDeliveryAttempt?: string;
  
  // Pokémon
  pokemonParty: Pokemon[];
  pcStorage: PCBox[];
  
  // Economía
  cobbleDollarsBalance: number;
  
  // Progreso del juego
  badges?: number;
  playtime?: number; // en minutos
  groups?: string[];
  
  // Admin
  isAdmin: boolean;
  banned: boolean;
  banReason?: string;
  bannedAt?: string;
  bannedBy?: string;
  unbannedAt?: string;
  unbannedBy?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
  syncedAt?: string;
}

/**
 * Usuario público (sin datos sensibles)
 */
export interface PublicUser {
  discordId: string | null;
  discordUsername: string;
  discordAvatar?: string;
  nickname: string;
  minecraftUuid?: string;
  minecraftUsername?: string;
  minecraftOnline?: boolean;
  starterId: number | null;
  starterIsShiny: boolean;
  pokemonParty: Pokemon[];
  badges?: number;
  createdAt: Date;
}

/**
 * Datos de sesión del usuario
 */
export interface UserSession {
  discordId: string;
  discordUsername: string;
  discordAvatar?: string;
  nickname: string;
  isAdmin: boolean;
  starterId: number | null;
  starterIsShiny: boolean;
  hasRolled: boolean;
  minecraftUuid?: string;
  minecraftUsername?: string;
  verified: boolean;
}

/**
 * Datos para crear un nuevo usuario
 */
export interface CreateUserData {
  discordId: string;
  discordUsername: string;
  discordAvatar?: string;
  nickname?: string;
}

/**
 * Datos de sincronización desde el plugin de Minecraft
 */
export interface PlayerSyncData {
  uuid: string;
  username: string;
  online?: boolean;
  lastSeen?: string;
  party?: Pokemon[];
  pcStorage?: PCBox[];
  cobbleDollarsBalance?: number;
  badges?: number;
  playtime?: number;
  groups?: string[];
}

/**
 * Respuesta de estado de ban
 */
export interface BanStatus {
  banned: boolean;
  banReason?: string;
}

/**
 * Respuesta de estado de verificación
 */
export interface VerificationStatus {
  verified: boolean;
  verifiedAt?: string;
  minecraftUuid?: string;
  minecraftUsername?: string;
}

/**
 * Respuesta de starter pendiente
 */
export interface PendingStarter {
  pending: boolean;
  pokemonId?: number;
  isShiny?: boolean;
  starterName?: string;
}

// ============================================
// ESQUEMAS DE VALIDACIÓN ZOD
// ============================================

/**
 * Esquema para datos de sincronización del plugin
 */
export const PlayerSyncSchema = z.object({
  uuid: z.string().min(1, 'UUID es requerido'),
  username: z.string().min(1, 'Username es requerido'),
  online: z.boolean().optional(),
  lastSeen: z.string().optional(),
  party: z.array(z.any()).optional(), // Se valida más específicamente en pokemon.types
  pcStorage: z.array(z.any()).optional(),
  cobbleDollarsBalance: z.number().min(0).optional(),
  badges: z.number().min(0).max(100).optional(),
  playtime: z.number().min(0).optional(),
  groups: z.array(z.string()).optional(),
});

/**
 * Esquema para crear usuario desde Discord
 */
export const CreateUserSchema = z.object({
  discordId: z.string().min(1, 'Discord ID es requerido'),
  discordUsername: z.string().min(1, 'Discord username es requerido'),
  discordAvatar: z.string().optional(),
  nickname: z.string().optional(),
});

/**
 * Esquema para operación de ban
 */
export const BanOperationSchema = z.object({
  uuid: z.string().min(1, 'UUID es requerido'),
  banned: z.boolean(),
  reason: z.string().optional(),
});

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Convierte un User a PublicUser (elimina datos sensibles)
 */
export function toPublicUser(user: User): PublicUser {
  return {
    discordId: user.discordId,
    discordUsername: user.discordUsername,
    discordAvatar: user.discordAvatar,
    nickname: user.nickname,
    minecraftUuid: user.minecraftUuid,
    minecraftUsername: user.minecraftUsername,
    minecraftOnline: user.minecraftOnline,
    starterId: user.starterId,
    starterIsShiny: user.starterIsShiny,
    pokemonParty: user.pokemonParty || [],
    badges: user.badges,
    createdAt: user.createdAt,
  };
}

/**
 * Convierte un User a UserSession
 */
export function toUserSession(user: User): UserSession {
  return {
    discordId: user.discordId || '',
    discordUsername: user.discordUsername,
    discordAvatar: user.discordAvatar,
    nickname: user.nickname,
    isAdmin: user.isAdmin,
    starterId: user.starterId,
    starterIsShiny: user.starterIsShiny,
    hasRolled: user.starterId !== null,
    minecraftUuid: user.minecraftUuid,
    minecraftUsername: user.minecraftUsername,
    verified: user.verified,
  };
}

/**
 * Crea un objeto User por defecto para nuevos usuarios
 */
export function createDefaultUser(data: CreateUserData): Omit<User, '_id'> {
  return {
    discordId: data.discordId,
    discordUsername: data.discordUsername,
    discordAvatar: data.discordAvatar,
    nickname: data.nickname || data.discordUsername,
    verified: false,
    starterId: null,
    starterIsShiny: false,
    starterGiven: false,
    rolledAt: null,
    pokemonParty: [],
    pcStorage: [],
    cobbleDollarsBalance: 0,
    isAdmin: false,
    banned: false,
    createdAt: new Date(),
  };
}
