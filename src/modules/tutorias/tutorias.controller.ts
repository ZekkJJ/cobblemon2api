import { Request, Response } from 'express';
import { TutoriasService } from './tutorias.service';
import { PricingService } from './pricing.service';
import { CooldownService } from './cooldown.service';
import { DailyLimitService } from './daily-limit.service';
import { BattleLogService } from './battle-log.service';
import { AIService } from './ai.service';
import { PokeBoxService } from './pokebox.service';
import { StatCalculatorService } from './stat-calculator.service';
import { EVPlanService } from './ev-plan.service';
import { BalanceIntegrityService } from './balance-integrity.service';
import { SuspiciousActivityService } from './suspicious-activity.service';
import { ServiceType } from './tutorias.schema';

export class TutoriasController {
  private tutoriasService: TutoriasService;
  private pricingService: PricingService;
  private cooldownService: CooldownService;
  private dailyLimitService: DailyLimitService;
  private battleLogService: BattleLogService;
  private aiService: AIService;
  private pokeBoxService: PokeBoxService;
  private statCalculatorService: StatCalculatorService;
  private evPlanService: EVPlanService;
  private balanceIntegrityService: BalanceIntegrityService;
  private suspiciousActivityService: SuspiciousActivityService;

  constructor() {
    this.tutoriasService = new TutoriasService();
    this.pricingService = new PricingService();
    this.cooldownService = new CooldownService();
    this.dailyLimitService = new DailyLimitService();
    this.battleLogService = new BattleLogService();
    this.aiService = new AIService();
    this.pokeBoxService = new PokeBoxService();
    this.statCalculatorService = new StatCalculatorService();
    this.evPlanService = new EVPlanService();
    this.balanceIntegrityService = new BalanceIntegrityService();
    this.suspiciousActivityService = new SuspiciousActivityService();
  }

  // ============================================================================
  // Battle Analysis
  // ============================================================================
  requestBattleAnalysis = async (req: Request, res: Response) => {
    try {
      const { battleId } = req.body;
      const user = (req as any).user;

      if (!battleId) {
        return res.status(400).json({ error: 'battleId es requerido' });
      }

      // Check cooldown
      const cooldownStatus = await this.cooldownService.checkCooldown(user.discordId, 'BATTLE_ANALYSIS');
      if (!cooldownStatus.allowed) {
        return res.status(429).json({ 
          error: 'COOLDOWN_ACTIVE',
          message: `Debes esperar ${Math.ceil((cooldownStatus.remainingMs || 0) / 60000)} minutos antes de usar este servicio`,
          remainingMs: cooldownStatus.remainingMs
        });
      }

      // Check daily limit
      const dailyLimitStatus = await this.dailyLimitService.checkDailyLimit(user.discordId, 'BATTLE_ANALYSIS');
      if (!dailyLimitStatus.allowed) {
        return res.status(429).json({
          error: 'DAILY_LIMIT_EXCEEDED',
          message: 'Has alcanzado el límite diario para este servicio',
          resetsAt: dailyLimitStatus.resetsAt
        });
      }

      // Check balance and charge
      const chargeResult = await this.pricingService.chargeUser(user.discordId, 'BATTLE_ANALYSIS');
      if (!chargeResult.success) {
        return res.status(402).json({
          error: 'INSUFFICIENT_BALANCE',
          message: `No tienes suficientes CobbleDollars. Necesitas ${chargeResult.requiredAmount}`,
          requiredAmount: chargeResult.requiredAmount
        });
      }

      // Get battle log and analyze
      const battleLog = await this.battleLogService.getBattleLog(battleId);
      if (!battleLog) {
        // Refund if battle not found
        await this.pricingService.refundUser(user.discordId, 'BATTLE_ANALYSIS');
        return res.status(404).json({ error: 'BATTLE_NOT_FOUND', message: 'Batalla no encontrada' });
      }

      const analysis = await this.aiService.analyzeBattle(battleLog);

      // Record cooldown and daily usage
      await this.cooldownService.recordRequest(user.discordId, 'BATTLE_ANALYSIS');
      await this.dailyLimitService.incrementUsage(user.discordId, 'BATTLE_ANALYSIS');

      // Save analysis result
      await this.battleLogService.saveAnalysis(battleId, analysis);

      res.json({
        success: true,
        analysis,
        newBalance: chargeResult.newBalance
      });
    } catch (error) {
      console.error('Error in requestBattleAnalysis:', error);
      res.status(500).json({ error: 'AI_SERVICE_ERROR', message: 'Error al procesar tu solicitud. Intenta de nuevo' });
    }
  };

  getBattleHistory = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const history = await this.battleLogService.getBattlesForUser(user.discordId);
      res.json({ battles: history });
    } catch (error) {
      console.error('Error in getBattleHistory:', error);
      res.status(500).json({ error: 'Error al obtener historial de batallas' });
    }
  };

  getBattleAnalysis = async (req: Request, res: Response) => {
    try {
      const { battleId } = req.params;
      const battleLog = await this.battleLogService.getBattleLog(battleId);
      
      if (!battleLog) {
        return res.status(404).json({ error: 'BATTLE_NOT_FOUND', message: 'Batalla no encontrada' });
      }

      res.json({ battle: battleLog });
    } catch (error) {
      console.error('Error in getBattleAnalysis:', error);
      res.status(500).json({ error: 'Error al obtener análisis de batalla' });
    }
  };

  // ============================================================================
  // AI Tutor
  // ============================================================================
  askAITutor = async (req: Request, res: Response) => {
    try {
      const { question, includeTeamData } = req.body;
      const user = (req as any).user;

      if (!question || question.trim().length < 10) {
        return res.status(400).json({ error: 'La pregunta debe tener al menos 10 caracteres' });
      }

      if (question.length > 2000) {
        return res.status(400).json({ error: 'La pregunta no puede exceder 2000 caracteres' });
      }

      // Check cooldown
      const cooldownStatus = await this.cooldownService.checkCooldown(user.discordId, 'AI_TUTOR');
      if (!cooldownStatus.allowed) {
        return res.status(429).json({ 
          error: 'COOLDOWN_ACTIVE',
          message: `Debes esperar ${Math.ceil((cooldownStatus.remainingMs || 0) / 60000)} minutos antes de usar este servicio`,
          remainingMs: cooldownStatus.remainingMs
        });
      }

      // Check daily limit
      const dailyLimitStatus = await this.dailyLimitService.checkDailyLimit(user.discordId, 'AI_TUTOR');
      if (!dailyLimitStatus.allowed) {
        return res.status(429).json({
          error: 'DAILY_LIMIT_EXCEEDED',
          message: 'Has alcanzado el límite diario para este servicio',
          resetsAt: dailyLimitStatus.resetsAt
        });
      }

      // Check balance and charge
      const chargeResult = await this.pricingService.chargeUser(user.discordId, 'AI_TUTOR');
      if (!chargeResult.success) {
        return res.status(402).json({
          error: 'INSUFFICIENT_BALANCE',
          message: `No tienes suficientes CobbleDollars. Necesitas ${chargeResult.requiredAmount}`,
          requiredAmount: chargeResult.requiredAmount
        });
      }

      // Get team data if requested
      let teamData = null;
      if (includeTeamData) {
        teamData = await this.tutoriasService.getUserTeamData(user.discordId);
      }

      const response = await this.aiService.answerTeamQuestion(question, teamData);

      // Record cooldown and daily usage
      await this.cooldownService.recordRequest(user.discordId, 'AI_TUTOR');
      await this.dailyLimitService.incrementUsage(user.discordId, 'AI_TUTOR');

      // Save to history
      await this.aiService.saveAITutorHistory(user.discordId, question, response, chargeResult.chargedAmount || 0);

      res.json({
        success: true,
        response,
        newBalance: chargeResult.newBalance
      });
    } catch (error) {
      console.error('Error in askAITutor:', error);
      res.status(500).json({ error: 'AI_SERVICE_ERROR', message: 'Error al procesar tu solicitud. Intenta de nuevo' });
    }
  };

  getAITutorHistory = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const history = await this.aiService.getAITutorHistory(user.discordId);
      res.json({ history });
    } catch (error) {
      console.error('Error in getAITutorHistory:', error);
      res.status(500).json({ error: 'Error al obtener historial' });
    }
  };

  // ============================================================================
  // Breed Advisor
  // ============================================================================
  askBreedAdvisor = async (req: Request, res: Response) => {
    try {
      const { targetSpecies, targetIVs, targetNature, targetAbility, includeShinyAdvice } = req.body;
      const user = (req as any).user;

      // Check cooldown
      const cooldownStatus = await this.cooldownService.checkCooldown(user.discordId, 'BREED_ADVISOR');
      if (!cooldownStatus.allowed) {
        return res.status(429).json({ 
          error: 'COOLDOWN_ACTIVE',
          message: `Debes esperar ${Math.ceil((cooldownStatus.remainingMs || 0) / 60000)} minutos antes de usar este servicio`,
          remainingMs: cooldownStatus.remainingMs
        });
      }

      // Check daily limit
      const dailyLimitStatus = await this.dailyLimitService.checkDailyLimit(user.discordId, 'BREED_ADVISOR');
      if (!dailyLimitStatus.allowed) {
        return res.status(429).json({
          error: 'DAILY_LIMIT_EXCEEDED',
          message: 'Has alcanzado el límite diario para este servicio',
          resetsAt: dailyLimitStatus.resetsAt
        });
      }

      // Check balance and charge
      const chargeResult = await this.pricingService.chargeUser(user.discordId, 'BREED_ADVISOR');
      if (!chargeResult.success) {
        return res.status(402).json({
          error: 'INSUFFICIENT_BALANCE',
          message: `No tienes suficientes CobbleDollars. Necesitas ${chargeResult.requiredAmount}`,
          requiredAmount: chargeResult.requiredAmount
        });
      }

      // Get user's available Pokemon for breeding
      const availablePokemon = await this.tutoriasService.getUserPokemonForBreeding(user.discordId);

      const response = await this.aiService.getBreedingAdvice({
        targetSpecies,
        targetIVs,
        targetNature,
        targetAbility,
        includeShinyAdvice
      }, availablePokemon);

      // Record cooldown and daily usage
      await this.cooldownService.recordRequest(user.discordId, 'BREED_ADVISOR');
      await this.dailyLimitService.incrementUsage(user.discordId, 'BREED_ADVISOR');

      res.json({
        success: true,
        response,
        newBalance: chargeResult.newBalance
      });
    } catch (error) {
      console.error('Error in askBreedAdvisor:', error);
      res.status(500).json({ error: 'AI_SERVICE_ERROR', message: 'Error al procesar tu solicitud. Intenta de nuevo' });
    }
  };

  // ============================================================================
  // PokéBox
  // ============================================================================
  getPokeBox = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const filters = req.query;
      const pokemon = await this.pokeBoxService.getPokeBox(user.discordId, filters);
      res.json({ pokemon });
    } catch (error) {
      console.error('Error in getPokeBox:', error);
      res.status(500).json({ error: 'Error al obtener PokéBox' });
    }
  };

  updateProtection = async (req: Request, res: Response) => {
    try {
      const { pokemonUuid, protected: isProtected } = req.body;
      const user = (req as any).user;

      if (!pokemonUuid) {
        return res.status(400).json({ error: 'pokemonUuid es requerido' });
      }

      await this.pokeBoxService.updateProtection(user.discordId, pokemonUuid, isProtected);
      res.json({ success: true });
    } catch (error) {
      console.error('Error in updateProtection:', error);
      res.status(500).json({ error: 'Error al actualizar protección' });
    }
  };

  getDuplicates = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const duplicates = await this.pokeBoxService.getDuplicates(user.discordId);
      res.json({ duplicates });
    } catch (error) {
      console.error('Error in getDuplicates:', error);
      res.status(500).json({ error: 'Error al obtener duplicados' });
    }
  };

  // ============================================================================
  // Stat Planner
  // ============================================================================
  saveEVPlan = async (req: Request, res: Response) => {
    try {
      const { pokemonUuid, pokemonSpecies, evDistribution } = req.body;
      const user = (req as any).user;

      if (!pokemonUuid || !evDistribution) {
        return res.status(400).json({ error: 'pokemonUuid y evDistribution son requeridos' });
      }

      // Calculate projected stats
      const pokemon = await this.tutoriasService.getPokemonByUuid(user.discordId, pokemonUuid);
      if (!pokemon) {
        return res.status(404).json({ error: 'POKEMON_NOT_FOUND', message: 'Pokémon no encontrado en tu PC' });
      }

      const projectedStats50 = this.statCalculatorService.calculateStats(pokemon, evDistribution, 50);
      const projectedStats100 = this.statCalculatorService.calculateStats(pokemon, evDistribution, 100);

      await this.evPlanService.saveEVPlan(user.discordId, {
        pokemonUuid,
        pokemonSpecies: pokemonSpecies || pokemon.species,
        evDistribution,
        projectedStats50,
        projectedStats100
      });

      res.json({ 
        success: true,
        projectedStats50,
        projectedStats100
      });
    } catch (error) {
      console.error('Error in saveEVPlan:', error);
      res.status(500).json({ error: 'Error al guardar plan de EVs' });
    }
  };

  getEVPlan = async (req: Request, res: Response) => {
    try {
      const { pokemonUuid } = req.params;
      const user = (req as any).user;

      const plan = await this.evPlanService.getEVPlan(user.discordId, pokemonUuid);
      if (!plan) {
        return res.status(404).json({ error: 'Plan no encontrado' });
      }

      res.json({ plan });
    } catch (error) {
      console.error('Error in getEVPlan:', error);
      res.status(500).json({ error: 'Error al obtener plan de EVs' });
    }
  };

  // ============================================================================
  // Pricing & Cooldowns
  // ============================================================================
  getPricing = async (req: Request, res: Response) => {
    try {
      const pricing = await this.pricingService.getAllPrices();
      res.json({ pricing });
    } catch (error) {
      console.error('Error in getPricing:', error);
      res.status(500).json({ error: 'Error al obtener precios' });
    }
  };

  updatePricing = async (req: Request, res: Response) => {
    try {
      const { serviceType, price, cooldownMinutes, dailyLimit } = req.body;
      const user = (req as any).user;

      if (!serviceType) {
        return res.status(400).json({ error: 'serviceType es requerido' });
      }

      await this.pricingService.updatePrice(serviceType as ServiceType, {
        price,
        cooldownMinutes,
        dailyLimit,
        updatedBy: user.discordId
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error in updatePricing:', error);
      res.status(500).json({ error: 'Error al actualizar precios' });
    }
  };

  getCooldowns = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const cooldowns = await this.cooldownService.getCooldowns(user.discordId);
      res.json({ cooldowns });
    } catch (error) {
      console.error('Error in getCooldowns:', error);
      res.status(500).json({ error: 'Error al obtener cooldowns' });
    }
  };

  // ============================================================================
  // Plugin Integration
  // ============================================================================
  storeBattleLog = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      
      // Map plugin format to service format
      // Plugin sends: winnerUuid, loserUuid, player1, player2
      // Service expects: winner, player1Uuid, player2Uuid, etc.
      const battleLog = {
        id: data.battleId,
        player1Uuid: data.player1?.uuid,
        player1Username: data.player1?.username || 'Jugador 1',
        player2Uuid: data.player2?.uuid,
        player2Username: data.player2?.username || 'Jugador 2',
        winner: data.winnerUuid, // The UUID of the winner
        result: data.result || 'KO',
        startTime: data.startTime,
        endTime: data.endTime,
        duration: data.duration || (data.endTime - data.startTime),
        turns: (data.turns || []).map((turn: any, index: number) => ({
          turnNumber: turn.turn || index + 1,
          player1Action: {
            type: turn.player1Move?.includes('Switch') ? 'switch' : 'move',
            move: turn.player1Move,
            pokemon: turn.player1Pokemon
          },
          player2Action: {
            type: turn.player2Move?.includes('Switch') ? 'switch' : 'move',
            move: turn.player2Move,
            pokemon: turn.player2Pokemon
          },
          fieldState: { weather: null, terrain: null }
        })),
        initialState: {
          player1Team: data.player1?.team || [],
          player2Team: data.player2?.team || []
        }
      };
      
      // If no turns were captured, create a minimal turn
      if (!battleLog.turns || battleLog.turns.length === 0) {
        battleLog.turns = [{
          turnNumber: 1,
          player1Action: { type: 'unknown', move: 'Unknown', pokemon: 'Unknown' },
          player2Action: { type: 'unknown', move: 'Unknown', pokemon: 'Unknown' },
          fieldState: { weather: null, terrain: null }
        }];
      }
      
      console.log('[TUTORIAS] Storing battle log:', {
        id: battleLog.id,
        player1: battleLog.player1Uuid,
        player2: battleLog.player2Uuid,
        winner: battleLog.winner,
        turns: battleLog.turns.length
      });
      
      const battleId = await this.battleLogService.storeBattleLog(battleLog);
      res.json({ success: true, battleId });
    } catch (error) {
      console.error('Error in storeBattleLog:', error);
      res.status(500).json({ success: false, error: 'Error al guardar log de batalla' });
    }
  };

  getPendingSyncs = async (req: Request, res: Response) => {
    try {
      const { minecraftUuid } = req.params;
      const pendingSyncs = await this.balanceIntegrityService.getPendingSyncs(minecraftUuid);
      res.json({ pendingSyncs });
    } catch (error) {
      console.error('Error in getPendingSyncs:', error);
      res.status(500).json({ error: 'Error al obtener syncs pendientes' });
    }
  };

  confirmSync = async (req: Request, res: Response) => {
    try {
      const { syncId, success, error } = req.body;
      await this.balanceIntegrityService.confirmSync(syncId, success, error);
      res.json({ success: true });
    } catch (error) {
      console.error('Error in confirmSync:', error);
      res.status(500).json({ error: 'Error al confirmar sync' });
    }
  };

  // ============================================================================
  // Admin
  // ============================================================================
  getSuspiciousActivity = async (req: Request, res: Response) => {
    try {
      const { resolved, severity, limit } = req.query;
      const activities = await this.suspiciousActivityService.getActivities({
        resolved: resolved === 'true',
        severity: severity as string,
        limit: parseInt(limit as string) || 50
      });
      res.json({ activities });
    } catch (error) {
      console.error('Error in getSuspiciousActivity:', error);
      res.status(500).json({ error: 'Error al obtener actividad sospechosa' });
    }
  };

  resolveSuspiciousActivity = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { action } = req.body;
      const user = (req as any).user;

      await this.suspiciousActivityService.resolveActivity(id, user.discordId, action);
      res.json({ success: true });
    } catch (error) {
      console.error('Error in resolveSuspiciousActivity:', error);
      res.status(500).json({ error: 'Error al resolver actividad' });
    }
  };

  getBalanceLedger = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const ledger = await this.balanceIntegrityService.getUserLedger(userId);
      res.json({ ledger });
    } catch (error) {
      console.error('Error in getBalanceLedger:', error);
      res.status(500).json({ error: 'Error al obtener ledger' });
    }
  };

  getAbuseStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.suspiciousActivityService.getStats();
      res.json({ stats });
    } catch (error) {
      console.error('Error in getAbuseStats:', error);
      res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
  };
}
