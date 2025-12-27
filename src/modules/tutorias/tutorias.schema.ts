import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// Battle Log Schema
// ============================================================================
export interface IBattleAction {
  type: 'MOVE' | 'SWITCH' | 'ITEM' | 'FORFEIT';
  pokemon?: string;
  move?: string;
  target?: string;
  damage?: number;
  critical?: boolean;
  effectiveness?: 'SUPER' | 'NORMAL' | 'NOT_VERY' | 'IMMUNE';
  statusApplied?: string;
}

export interface IFieldState {
  weather?: string;
  terrain?: string;
  hazards: { side: string; type: string }[];
}

export interface ITurnLog {
  turnNumber: number;
  player1Action: IBattleAction;
  player2Action: IBattleAction;
  fieldState: IFieldState;
  events: string[];
}

export interface IBattleState {
  player1Team: any[];
  player2Team: any[];
  weather?: string;
  terrain?: string;
}

export interface IBattleLogDocument extends Document {
  battleId: string;
  player1Uuid: string;
  player1Username: string;
  player2Uuid: string;
  player2Username: string;
  winner: string;
  result: 'KO' | 'FORFEIT' | 'TIMEOUT';
  startTime: Date;
  endTime: Date;
  duration: number;
  turnCount: number;
  turns: ITurnLog[];
  initialState: IBattleState;
  analyzed: boolean;
  analysisResult?: any;
  createdAt: Date;
}

const BattleActionSchema = new Schema({
  type: { type: String, enum: ['MOVE', 'SWITCH', 'ITEM', 'FORFEIT'], required: true },
  pokemon: String,
  move: String,
  target: String,
  damage: Number,
  critical: Boolean,
  effectiveness: { type: String, enum: ['SUPER', 'NORMAL', 'NOT_VERY', 'IMMUNE'] },
  statusApplied: String
}, { _id: false });

const FieldStateSchema = new Schema({
  weather: String,
  terrain: String,
  hazards: [{ side: String, type: String }]
}, { _id: false });

const TurnLogSchema = new Schema({
  turnNumber: { type: Number, required: true },
  player1Action: BattleActionSchema,
  player2Action: BattleActionSchema,
  fieldState: FieldStateSchema,
  events: [String]
}, { _id: false });

const BattleStateSchema = new Schema({
  player1Team: [Schema.Types.Mixed],
  player2Team: [Schema.Types.Mixed],
  weather: String,
  terrain: String
}, { _id: false });

const BattleLogSchema = new Schema({
  battleId: { type: String, required: true, unique: true, index: true },
  player1Uuid: { type: String, required: true, index: true },
  player1Username: { type: String, required: true },
  player2Uuid: { type: String, required: true, index: true },
  player2Username: { type: String, required: true },
  winner: { type: String, required: true },
  result: { type: String, enum: ['KO', 'FORFEIT', 'TIMEOUT'], required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  duration: { type: Number, required: true },
  turnCount: { type: Number, required: true },
  turns: [TurnLogSchema],
  initialState: BattleStateSchema,
  analyzed: { type: Boolean, default: false },
  analysisResult: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

export const BattleLogModel = mongoose.model<IBattleLogDocument>('TutoriasBattleLog', BattleLogSchema);

// ============================================================================
// Cooldown Schema
// ============================================================================
export type ServiceType = 'BATTLE_ANALYSIS' | 'AI_TUTOR' | 'BREED_ADVISOR';

export interface ICooldownDocument extends Document {
  discordId: string;
  serviceType: ServiceType;
  lastRequest: Date;
  expiresAt: Date;
}

const CooldownSchema = new Schema({
  discordId: { type: String, required: true, index: true },
  serviceType: { type: String, enum: ['BATTLE_ANALYSIS', 'AI_TUTOR', 'BREED_ADVISOR'], required: true },
  lastRequest: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: true }
});

CooldownSchema.index({ discordId: 1, serviceType: 1 }, { unique: true });

export const CooldownModel = mongoose.model<ICooldownDocument>('TutoriasCooldown', CooldownSchema);

// ============================================================================
// Pricing Schema
// ============================================================================
export interface IPricingDocument extends Document {
  serviceType: ServiceType;
  price: number;
  cooldownMinutes: number;
  dailyLimit: number;
  updatedAt: Date;
  updatedBy: string;
}

const PricingSchema = new Schema({
  serviceType: { type: String, enum: ['BATTLE_ANALYSIS', 'AI_TUTOR', 'BREED_ADVISOR'], required: true, unique: true },
  price: { type: Number, required: true, min: 0 },
  cooldownMinutes: { type: Number, required: true, min: 0 },
  dailyLimit: { type: Number, required: true, min: 1 },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: String
});

export const PricingModel = mongoose.model<IPricingDocument>('TutoriasPricing', PricingSchema);

// ============================================================================
// EV Plan Schema
// ============================================================================
export interface IPokemonStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface IEVPlanDocument extends Document {
  discordId: string;
  pokemonUuid: string;
  pokemonSpecies: string;
  evDistribution: IPokemonStats;
  projectedStats50: IPokemonStats;
  projectedStats100: IPokemonStats;
  createdAt: Date;
  updatedAt: Date;
}

const PokemonStatsSchema = new Schema({
  hp: { type: Number, required: true, min: 0 },
  attack: { type: Number, required: true, min: 0 },
  defense: { type: Number, required: true, min: 0 },
  specialAttack: { type: Number, required: true, min: 0 },
  specialDefense: { type: Number, required: true, min: 0 },
  speed: { type: Number, required: true, min: 0 }
}, { _id: false });

const EVPlanSchema = new Schema({
  discordId: { type: String, required: true, index: true },
  pokemonUuid: { type: String, required: true, index: true },
  pokemonSpecies: { type: String, required: true },
  evDistribution: PokemonStatsSchema,
  projectedStats50: PokemonStatsSchema,
  projectedStats100: PokemonStatsSchema,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

EVPlanSchema.index({ discordId: 1, pokemonUuid: 1 }, { unique: true });

export const EVPlanModel = mongoose.model<IEVPlanDocument>('TutoriasEVPlan', EVPlanSchema);

// ============================================================================
// Protected Pokemon Schema
// ============================================================================
export interface IProtectedPokemonDocument extends Document {
  discordId: string;
  pokemonUuid: string;
  protectedAt: Date;
}

const ProtectedPokemonSchema = new Schema({
  discordId: { type: String, required: true, index: true },
  pokemonUuid: { type: String, required: true },
  protectedAt: { type: Date, default: Date.now }
});

ProtectedPokemonSchema.index({ discordId: 1, pokemonUuid: 1 }, { unique: true });

export const ProtectedPokemonModel = mongoose.model<IProtectedPokemonDocument>('TutoriasProtectedPokemon', ProtectedPokemonSchema);

// ============================================================================
// Daily Usage Schema
// ============================================================================
export interface IDailyUsageDocument extends Document {
  discordId: string;
  serviceType: ServiceType;
  date: string; // YYYY-MM-DD format
  count: number;
}

const DailyUsageSchema = new Schema({
  discordId: { type: String, required: true, index: true },
  serviceType: { type: String, enum: ['BATTLE_ANALYSIS', 'AI_TUTOR', 'BREED_ADVISOR'], required: true },
  date: { type: String, required: true },
  count: { type: Number, default: 0 }
});

DailyUsageSchema.index({ discordId: 1, serviceType: 1, date: 1 }, { unique: true });

export const DailyUsageModel = mongoose.model<IDailyUsageDocument>('TutoriasDailyUsage', DailyUsageSchema);

// ============================================================================
// AI Tutor History Schema
// ============================================================================
export interface IAITutorHistoryDocument extends Document {
  discordId: string;
  question: string;
  answer: string;
  teamAnalysis?: any;
  suggestions: any[];
  cost: number;
  createdAt: Date;
}

const AITutorHistorySchema = new Schema({
  discordId: { type: String, required: true, index: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  teamAnalysis: Schema.Types.Mixed,
  suggestions: [Schema.Types.Mixed],
  cost: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const AITutorHistoryModel = mongoose.model<IAITutorHistoryDocument>('TutoriasAITutorHistory', AITutorHistorySchema);

// ============================================================================
// Transaction Ledger Schema (Anti-Tamper)
// ============================================================================
export type TransactionSource = 
  | 'PLUGIN_SYNC'
  | 'SERVICE_CHARGE'
  | 'ADMIN_ADJUST'
  | 'GACHA_PURCHASE'
  | 'SHOP_PURCHASE'
  | 'TOURNAMENT_PRIZE'
  | 'REFUND';

export interface ITransactionLedgerDocument extends Document {
  discordId: string;
  minecraftUuid?: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  source: TransactionSource;
  sourceId?: string;
  previousBalance: number;
  newBalance: number;
  timestamp: Date;
  signature: string;
}

const TransactionLedgerSchema = new Schema({
  discordId: { type: String, required: true, index: true },
  minecraftUuid: String,
  type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
  amount: { type: Number, required: true },
  source: { 
    type: String, 
    enum: ['PLUGIN_SYNC', 'SERVICE_CHARGE', 'ADMIN_ADJUST', 'GACHA_PURCHASE', 'SHOP_PURCHASE', 'TOURNAMENT_PRIZE', 'REFUND'],
    required: true 
  },
  sourceId: String,
  previousBalance: { type: Number, required: true },
  newBalance: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  signature: { type: String, required: true }
});

export const TransactionLedgerModel = mongoose.model<ITransactionLedgerDocument>('TutoriasTransactionLedger', TransactionLedgerSchema);

// ============================================================================
// Suspicious Activity Schema
// ============================================================================
export type SuspiciousActivityType = 
  | 'INVALID_SIGNATURE'
  | 'IMPOSSIBLE_BALANCE_JUMP'
  | 'RATE_LIMIT_EXCEEDED'
  | 'BOT_TIMING_DETECTED'
  | 'DUPLICATE_REQUESTS'
  | 'LEDGER_DISCREPANCY'
  | 'REPLAY_ATTACK_ATTEMPT';

export interface ISuspiciousActivityDocument extends Document {
  discordId: string;
  minecraftUuid?: string;
  activityType: SuspiciousActivityType;
  details: Record<string, any>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  action?: 'WARNED' | 'TEMP_BAN' | 'PERM_BAN' | 'BALANCE_RESET';
}

const SuspiciousActivitySchema = new Schema({
  discordId: { type: String, required: true, index: true },
  minecraftUuid: String,
  activityType: { 
    type: String, 
    enum: ['INVALID_SIGNATURE', 'IMPOSSIBLE_BALANCE_JUMP', 'RATE_LIMIT_EXCEEDED', 'BOT_TIMING_DETECTED', 'DUPLICATE_REQUESTS', 'LEDGER_DISCREPANCY', 'REPLAY_ATTACK_ATTEMPT'],
    required: true 
  },
  details: { type: Schema.Types.Mixed, default: {} },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  resolved: { type: Boolean, default: false },
  resolvedBy: String,
  resolvedAt: Date,
  action: { type: String, enum: ['WARNED', 'TEMP_BAN', 'PERM_BAN', 'BALANCE_RESET'] }
});

export const SuspiciousActivityModel = mongoose.model<ISuspiciousActivityDocument>('TutoriasSuspiciousActivity', SuspiciousActivitySchema);

// ============================================================================
// Pending Sync Schema
// ============================================================================
export interface IPendingSyncDocument extends Document {
  discordId: string;
  minecraftUuid: string;
  amount: number;
  serviceType: ServiceType;
  serviceId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  processedAt?: Date;
  error?: string;
}

const PendingSyncSchema = new Schema({
  discordId: { type: String, required: true, index: true },
  minecraftUuid: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  serviceType: { type: String, enum: ['BATTLE_ANALYSIS', 'AI_TUTOR', 'BREED_ADVISOR'], required: true },
  serviceId: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
  createdAt: { type: Date, default: Date.now },
  processedAt: Date,
  error: String
});

export const PendingSyncModel = mongoose.model<IPendingSyncDocument>('TutoriasPendingSync', PendingSyncSchema);
