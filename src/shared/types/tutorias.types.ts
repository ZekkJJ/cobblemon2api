// ============================================================================
// Service Types
// ============================================================================
export type ServiceType = 'BATTLE_ANALYSIS' | 'AI_TUTOR' | 'BREED_ADVISOR';

export interface ServiceCooldowns {
  battleAnalysis: number | null; // timestamp when expires, null if available
  aiTutor: number | null;
  breedAdvisor: number | null;
}

export interface ServicePricing {
  battleAnalysis: number;
  aiTutor: number;
  breedAdvisor: number;
}

export interface CooldownStatus {
  allowed: boolean;
  remainingMs?: number;
  expiresAt?: number;
}

export interface DailyLimitStatus {
  allowed: boolean;
  remaining: number;
  resetsAt: string;
}

export interface ChargeResult {
  success: boolean;
  newBalance?: number;
  chargedAmount?: number;
  error?: 'INSUFFICIENT_BALANCE';
  requiredAmount?: number;
}

// ============================================================================
// Battle Analysis Types
// ============================================================================
export interface BattleAction {
  type: 'MOVE' | 'SWITCH' | 'ITEM' | 'FORFEIT';
  pokemon?: string;
  move?: string;
  target?: string;
  damage?: number;
  critical?: boolean;
  effectiveness?: 'SUPER' | 'NORMAL' | 'NOT_VERY' | 'IMMUNE';
  statusApplied?: string;
}

export interface FieldState {
  weather?: string;
  terrain?: string;
  hazards: { side: string; type: string }[];
}

export interface TurnLog {
  turnNumber: number;
  player1Action: BattleAction;
  player2Action: BattleAction;
  fieldState: FieldState;
  events: string[];
}

export interface BattleState {
  player1Team: any[];
  player2Team: any[];
  weather?: string;
  terrain?: string;
}

export interface BattleLog {
  id: string;
  player1Uuid: string;
  player1Username: string;
  player2Uuid: string;
  player2Username: string;
  winner: string;
  result: 'KO' | 'FORFEIT' | 'TIMEOUT';
  startTime: string;
  endTime: string;
  duration: number;
  turnCount: number;
  turns: TurnLog[];
  initialState: BattleState;
}

export interface BattleSummary {
  id: string;
  date: string;
  opponent: string;
  opponentUuid: string;
  result: 'WIN' | 'LOSS' | 'DRAW';
  duration: number;
  turns: number;
  analyzed: boolean;
}

export interface MoveAction {
  move: string;
  pokemon: string;
  damage?: number;
  effectiveness?: string;
}

export interface TurnAnalysis {
  turn: number;
  playerMove: MoveAction;
  opponentMove: MoveAction;
  analysis: string;
  alternativePlay?: string;
}

export interface KeyMoment {
  turn: number;
  description: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

export interface BattleAnalysisRequest {
  battleId: string;
}

export interface BattleAnalysisResponse {
  battleId: string;
  summary: string;
  turnByTurn: TurnAnalysis[];
  keyMoments: KeyMoment[];
  recommendations: string[];
  overallRating: number; // 1-10
}

// ============================================================================
// AI Tutor Types
// ============================================================================
export interface AITutorRequest {
  question: string;
  includeTeamData: boolean;
}

export interface TeamAnalysis {
  strengths: string[];
  weaknesses: string[];
  typeChart: TypeCoverage;
}

export interface TypeCoverage {
  offensive: Record<string, number>;
  defensive: Record<string, number>;
}

export interface Suggestion {
  type: 'MOVESET' | 'POKEMON' | 'ITEM' | 'EV_SPREAD' | 'NATURE';
  target: string;
  suggestion: string;
  reasoning: string;
}

export interface AITutorResponse {
  answer: string;
  teamAnalysis?: TeamAnalysis;
  suggestions: Suggestion[];
}

// ============================================================================
// Breed Advisor Types
// ============================================================================
export interface BreedAdvisorRequest {
  targetSpecies?: string;
  targetIVs?: Partial<PokemonStats>;
  targetNature?: string;
  targetAbility?: string;
  includeShinyAdvice: boolean;
}

export interface PokemonSummary {
  uuid: string;
  species: string;
  gender: string;
  nature: string;
  ability: string;
  ivs: PokemonStats;
  shiny: boolean;
}

export interface BreedingPair {
  parent1: PokemonSummary;
  parent2: PokemonSummary;
  compatibility: number; // 0-100
  eggGroup: string;
  expectedIVs: PokemonStats;
}

export interface BreedingStep {
  step: number;
  parents: [string, string];
  expectedResult: string;
  itemsNeeded: string[];
  notes: string;
}

export interface IVInheritanceInfo {
  guaranteedIVs: number;
  destinyKnotEffect: string;
  powerItemEffect: string;
}

export interface AbilityInheritanceInfo {
  motherAbility: string;
  inheritanceChance: number;
  hiddenAbilityChance?: number;
}

export interface ShinyOddsInfo {
  baseOdds: string;
  masudaBonus: boolean;
  crystalBonus: number;
  finalOdds: string;
  expectedEggs: number;
}

export interface BreedAdvisorResponse {
  breedingPairs: BreedingPair[];
  breedingChain: BreedingStep[];
  ivInheritance: IVInheritanceInfo;
  abilityInheritance: AbilityInheritanceInfo;
  shinyOdds?: ShinyOddsInfo;
  estimatedEggs: number;
}

// ============================================================================
// PokéBox Types
// ============================================================================
export interface PokeBoxFilters {
  species?: string;
  types?: string[];
  shiny?: boolean;
  ivMin?: number; // percentage
  ivMax?: number;
  evTotal?: { min: number; max: number };
  nature?: string;
  ability?: string;
  levelRange?: { min: number; max: number };
}

export interface PokemonWithCalculations {
  uuid: string;
  species: string;
  nickname?: string;
  level: number;
  nature: string;
  ability: string;
  moves: string[];
  ivs: PokemonStats;
  evs: PokemonStats;
  shiny: boolean;
  ivPercentage: number;
  evRemaining: number;
  isProtected: boolean;
}

export interface DuplicateGroup {
  species: string;
  speciesId: number;
  pokemon: PokemonWithCalculations[];
  suggestedKeep: string; // uuid of best one
}

export interface ProtectionUpdate {
  pokemonUuid: string;
  protected: boolean;
}

// ============================================================================
// Stat Planner Types
// ============================================================================
export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface StatPlannerProps {
  pokemon: any;
  onSave: (plan: EVPlan) => void;
}

export interface EVPlan {
  pokemonUuid: string;
  pokemonSpecies: string;
  evDistribution: PokemonStats;
  projectedStats50: PokemonStats;
  projectedStats100: PokemonStats;
  savedAt: string;
}

export interface StatCalculation {
  base: number;
  iv: number;
  ev: number;
  nature: number; // 0.9, 1.0, or 1.1
  level: number;
  final: number;
}

// ============================================================================
// Anti-Tamper Types
// ============================================================================
export type TransactionSource = 
  | 'PLUGIN_SYNC'
  | 'SERVICE_CHARGE'
  | 'ADMIN_ADJUST'
  | 'GACHA_PURCHASE'
  | 'SHOP_PURCHASE'
  | 'TOURNAMENT_PRIZE'
  | 'REFUND';

export interface BalanceTransaction {
  id: string;
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

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export interface LedgerVerification {
  valid: boolean;
  currentBalance: number;
  calculatedBalance: number;
  discrepancy?: number;
  suspiciousTransactions: string[];
}

export type SuspiciousActivityType = 
  | 'INVALID_SIGNATURE'
  | 'IMPOSSIBLE_BALANCE_JUMP'
  | 'RATE_LIMIT_EXCEEDED'
  | 'BOT_TIMING_DETECTED'
  | 'DUPLICATE_REQUESTS'
  | 'LEDGER_DISCREPANCY'
  | 'REPLAY_ATTACK_ATTEMPT';

export interface SuspiciousActivity {
  id: string;
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

// ============================================================================
// Pending Sync Types
// ============================================================================
export interface PendingSync {
  id: string;
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

// ============================================================================
// Error Types
// ============================================================================
export type TutoriasErrorCode = 
  | 'INSUFFICIENT_BALANCE'
  | 'COOLDOWN_ACTIVE'
  | 'DAILY_LIMIT_EXCEEDED'
  | 'BATTLE_NOT_FOUND'
  | 'POKEMON_NOT_FOUND'
  | 'AI_SERVICE_ERROR'
  | 'NOT_VERIFIED'
  | 'INVALID_REQUEST';

export interface TutoriasError {
  code: TutoriasErrorCode;
  message: string;
  details?: Record<string, any>;
}
