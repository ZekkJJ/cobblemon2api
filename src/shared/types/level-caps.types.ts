/**
 * Tipos de Level Caps
 * Cobblemon Los Pitufos - Backend API
 * 
 * Define las interfaces y tipos relacionados con el sistema de límites de nivel.
 */

import { ObjectId } from 'mongodb';
import { z } from 'zod';

// ============================================
// INTERFACES PRINCIPALES
// ============================================

/**
 * Configuración global de level caps
 */
export interface GlobalLevelCapConfig {
  captureCapEnabled: boolean;
  ownershipCapEnabled: boolean;
  defaultCaptureCapFormula: string;
  defaultOwnershipCapFormula: string;
  enforcementMode: 'hard' | 'soft';
  customMessages: {
    captureFailed: string;
    expBlocked: string;
    itemBlocked: string;
    tradeBlocked: string;
  };
}

/**
 * Condiciones para reglas estáticas
 */
export interface StaticRuleConditions {
  playerGroups?: string[];
  specificPlayers?: string[];
  badges?: { min?: number; max?: number };
  playtime?: { min?: number; max?: number };
}

/**
 * Regla estática de level cap
 */
export interface StaticLevelCapRule {
  id: string;
  name: string;
  priority: number;
  active: boolean;
  conditions: StaticRuleConditions;
  captureCap?: number | null;
  ownershipCap?: number | null;
  createdBy: string;
  createdAt: Date;
  notes: string;
}

/**
 * Tipo de progresión temporal
 */
export type ProgressionType = 'daily' | 'interval' | 'schedule';

/**
 * Configuración de progresión
 */
export interface ProgressionConfig {
  type: ProgressionType;
  // Para type: 'daily'
  dailyIncrease?: number;
  // Para type: 'interval'
  intervalDays?: number;
  intervalIncrease?: number;
  // Para type: 'schedule'
  schedule?: Array<{
    date: string;
    setCap: number;
  }>;
}

/**
 * Regla temporal de level cap
 */
export interface TimeBasedLevelCapRule {
  id: string;
  name: string;
  active: boolean;
  targetCap: 'capture' | 'ownership' | 'both';
  progression: ProgressionConfig;
  startCap: number;
  maxCap?: number | null;
  startDate: string;
  endDate?: string | null;
  currentCap: number;
  lastUpdate: Date;
  createdBy: string;
  createdAt: Date;
}

/**
 * Registro de cambio en level caps
 */
export interface LevelCapChange {
  timestamp: Date;
  admin: string;
  action: string;
  before: unknown;
  after: unknown;
  reason: string;
}

/**
 * Cache de caps calculados por jugador
 */
export interface PlayerCapCache {
  uuid: string;
  effectiveCaptureCap: number;
  effectiveOwnershipCap: number;
  calculatedAt: Date;
  appliedRules: string[];
}

/**
 * Documento completo de level caps
 */
export interface LevelCapsDocument {
  _id?: ObjectId;
  globalConfig: GlobalLevelCapConfig;
  staticRules: StaticLevelCapRule[];
  timeBasedRules: TimeBasedLevelCapRule[];
  changeHistory: LevelCapChange[];
  playerCapCache?: PlayerCapCache[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Respuesta de caps efectivos
 */
export interface EffectiveCapsResponse {
  success: boolean;
  captureCap: number;
  ownershipCap: number;
  appliedRules: string[];
  calculatedAt: Date;
}

/**
 * Datos para crear regla estática
 */
export interface CreateStaticRuleData {
  name: string;
  priority: number;
  conditions: StaticRuleConditions;
  captureCap?: number | null;
  ownershipCap?: number | null;
  notes?: string;
}

/**
 * Datos para crear regla temporal
 */
export interface CreateTimeRuleData {
  name: string;
  targetCap: 'capture' | 'ownership' | 'both';
  progression: ProgressionConfig;
  startCap: number;
  maxCap?: number | null;
  startDate: string;
  endDate?: string | null;
}

// ============================================
// ESQUEMAS DE VALIDACIÓN ZOD
// ============================================

/**
 * Esquema para condiciones de regla estática
 */
export const StaticRuleConditionsSchema = z.object({
  playerGroups: z.array(z.string()).optional(),
  specificPlayers: z.array(z.string()).optional(),
  badges: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
  }).optional(),
  playtime: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
  }).optional(),
});

/**
 * Esquema para crear regla estática
 */
export const CreateStaticRuleSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido').max(100),
  priority: z.number().int().min(0).max(1000),
  conditions: StaticRuleConditionsSchema,
  captureCap: z.number().int().min(1).max(100).nullable().optional(),
  ownershipCap: z.number().int().min(1).max(100).nullable().optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Esquema para configuración de progresión
 */
export const ProgressionConfigSchema = z.object({
  type: z.enum(['daily', 'interval', 'schedule']),
  dailyIncrease: z.number().int().min(1).optional(),
  intervalDays: z.number().int().min(1).optional(),
  intervalIncrease: z.number().int().min(1).optional(),
  schedule: z.array(z.object({
    date: z.string(),
    setCap: z.number().int().min(1).max(100),
  })).optional(),
});

/**
 * Esquema para crear regla temporal
 */
export const CreateTimeRuleSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido').max(100),
  targetCap: z.enum(['capture', 'ownership', 'both']),
  progression: ProgressionConfigSchema,
  startCap: z.number().int().min(1).max(100),
  maxCap: z.number().int().min(1).max(100).nullable().optional(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
});

/**
 * Esquema para actualizar configuración global
 */
export const UpdateGlobalConfigSchema = z.object({
  captureCapEnabled: z.boolean().optional(),
  ownershipCapEnabled: z.boolean().optional(),
  defaultCaptureCapFormula: z.string().max(200).optional(),
  defaultOwnershipCapFormula: z.string().max(200).optional(),
  enforcementMode: z.enum(['hard', 'soft']).optional(),
  customMessages: z.object({
    captureFailed: z.string().max(200).optional(),
    expBlocked: z.string().max(200).optional(),
    itemBlocked: z.string().max(200).optional(),
    tradeBlocked: z.string().max(200).optional(),
  }).optional(),
});

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Evalúa una fórmula simple de level cap
 */
export function evaluateFormula(formula: string, player: {
  badges?: number;
  playtime?: number;
  level?: number;
}): number {
  try {
    const badges = player.badges || 0;
    const playtime = player.playtime || 0;
    const level = player.level || 1;

    // Reemplazar variables en la fórmula
    let evaluated = formula
      .replace(/badges/g, String(badges))
      .replace(/playtime/g, String(playtime))
      .replace(/level/g, String(level));

    // Evaluar matemáticamente (solo operaciones seguras)
    // Usar Function en lugar de eval para mayor seguridad
    const result = new Function(`return ${evaluated}`)();

    return typeof result === 'number' && !isNaN(result) ? Math.floor(result) : Infinity;
  } catch {
    return Infinity;
  }
}

/**
 * Calcula el cap actual de una regla temporal
 */
export function calculateTimeBasedCap(rule: TimeBasedLevelCapRule): number {
  const now = new Date();
  const startDate = new Date(rule.startDate);
  const daysPassed = Math.floor(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  let cap = rule.startCap;

  if (rule.progression.type === 'daily') {
    cap += daysPassed * (rule.progression.dailyIncrease || 0);
  } else if (rule.progression.type === 'interval') {
    const intervals = Math.floor(daysPassed / (rule.progression.intervalDays || 1));
    cap += intervals * (rule.progression.intervalIncrease || 0);
  } else if (rule.progression.type === 'schedule') {
    const applicableSchedules = (rule.progression.schedule || [])
      .filter(s => new Date(s.date) <= now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (applicableSchedules.length > 0 && applicableSchedules[0]) {
      cap = applicableSchedules[0].setCap;
    }
  }

  // Aplicar max cap si existe
  if (rule.maxCap) {
    cap = Math.min(cap, rule.maxCap);
  }

  return cap;
}

/**
 * Verifica si las condiciones de una regla se cumplen
 */
export function matchesConditions(
  conditions: StaticRuleConditions | undefined,
  player: {
    minecraftUuid?: string;
    groups?: string[];
    badges?: number;
    playtime?: number;
  }
): boolean {
  if (!conditions) return true;

  // Check player groups
  if (conditions.playerGroups && conditions.playerGroups.length > 0) {
    const playerGroups = player.groups || [];
    if (!conditions.playerGroups.some(g => playerGroups.includes(g))) {
      return false;
    }
  }

  // Check specific players
  if (conditions.specificPlayers && conditions.specificPlayers.length > 0) {
    if (!player.minecraftUuid || !conditions.specificPlayers.includes(player.minecraftUuid)) {
      return false;
    }
  }

  // Check badges
  if (conditions.badges) {
    const playerBadges = player.badges || 0;
    if (conditions.badges.min !== undefined && playerBadges < conditions.badges.min) return false;
    if (conditions.badges.max !== undefined && playerBadges > conditions.badges.max) return false;
  }

  // Check playtime
  if (conditions.playtime) {
    const playerPlaytime = player.playtime || 0;
    if (conditions.playtime.min !== undefined && playerPlaytime < conditions.playtime.min) return false;
    if (conditions.playtime.max !== undefined && playerPlaytime > conditions.playtime.max) return false;
  }

  return true;
}

/**
 * Crea configuración global por defecto
 */
export function createDefaultGlobalConfig(): GlobalLevelCapConfig {
  return {
    captureCapEnabled: true,
    ownershipCapEnabled: true,
    defaultCaptureCapFormula: '10 + badges * 5',
    defaultOwnershipCapFormula: '15 + badges * 5',
    enforcementMode: 'hard',
    customMessages: {
      captureFailed: '¡Este Pokémon es demasiado fuerte para capturarlo ahora!',
      expBlocked: 'Tu Pokémon ha alcanzado el límite de nivel actual.',
      itemBlocked: 'No puedes usar este objeto en un Pokémon que excede el límite.',
      tradeBlocked: 'No puedes recibir un Pokémon que excede tu límite de nivel.',
    },
  };
}

/**
 * Genera un ID único para reglas
 */
export function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
