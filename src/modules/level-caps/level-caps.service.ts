/**
 * Servicio de Level Caps - Cobblemon Los Pitufos Backend API
 */

import { Collection } from 'mongodb';
import { User } from '../../shared/types/user.types.js';
import { LevelCapsDocument, EffectiveCapsResponse, TimeBasedLevelCapRule } from '../../shared/types/level-caps.types.js';
import { AppError, Errors } from '../../shared/middleware/error-handler.js';
import { FormulaEvaluator } from '../../shared/utils/formula-evaluator.js';
import { 
  LEGENDARY_POKEMON, MYTHICAL_POKEMON, ULTRA_BEASTS, 
  PARADOX_POKEMON, MEGA_POKEMON, RESTRICTED_POKEMON 
} from '../../shared/data/legendary-pokemon.data.js';

export class LevelCapsService {
  constructor(
    private usersCollection: Collection<User>,
    private levelCapsCollection: Collection<LevelCapsDocument>
  ) {}

  async getEffectiveCaps(uuid: string): Promise<EffectiveCapsResponse> {
    try {
      const player = await this.usersCollection.findOne({ minecraftUuid: uuid });
      const config = await this.levelCapsCollection.findOne({});

      if (!config || !player) {
        return {
          success: true,
          captureCap: 100,
          ownershipCap: 100,
          appliedRules: [],
          calculatedAt: new Date(),
          pokemonRestrictions: {
            blockLegendaries: false,
            blockMythicals: false,
            blockUltraBeasts: false,
            blockParadox: false,
            blockMegas: false,
            blockRestricted: false,
            blockedSpecies: [],
            allowedSpecies: [],
          },
        };
      }

      let captureCap = Infinity;
      let ownershipCap = Infinity;
      const appliedRules: string[] = [];

      // 1. Evaluar fórmula por defecto
      if (config.globalConfig.captureCapEnabled && config.globalConfig.defaultCaptureCapFormula) {
        captureCap = this.evaluateFormula(config.globalConfig.defaultCaptureCapFormula, player);
      }

      if (config.globalConfig.ownershipCapEnabled && config.globalConfig.defaultOwnershipCapFormula) {
        ownershipCap = this.evaluateFormula(config.globalConfig.defaultOwnershipCapFormula, player);
      }

      // 2. Aplicar reglas estáticas
      const staticRules = (config.staticRules || [])
        .filter(r => r.active && this.matchesConditions(r.conditions, player))
        .sort((a, b) => b.priority - a.priority);

      for (const rule of staticRules) {
        if (rule.captureCap !== null && rule.captureCap !== undefined) {
          captureCap = Math.min(captureCap, rule.captureCap);
          appliedRules.push(rule.id);
        }
        if (rule.ownershipCap !== null && rule.ownershipCap !== undefined) {
          ownershipCap = Math.min(ownershipCap, rule.ownershipCap);
          appliedRules.push(rule.id);
        }
      }

      // 3. Aplicar reglas temporales
      const now = new Date();
      const timeRules = (config.timeBasedRules || []).filter(
        r => r.active && new Date(r.startDate) <= now && (!r.endDate || new Date(r.endDate) >= now)
      );

      for (const rule of timeRules) {
        const currentCap = this.calculateTimeBasedCap(rule);

        if (rule.targetCap === 'capture' || rule.targetCap === 'both') {
          captureCap = Math.min(captureCap, currentCap);
          appliedRules.push(rule.id);
        }
        if (rule.targetCap === 'ownership' || rule.targetCap === 'both') {
          ownershipCap = Math.min(ownershipCap, currentCap);
          appliedRules.push(rule.id);
        }
      }

      // 4. Asegurar relación lógica
      captureCap = Math.min(captureCap, ownershipCap);

      if (captureCap === Infinity) captureCap = 100;
      if (ownershipCap === Infinity) ownershipCap = 100;

      // 5. Calcular restricciones de Pokémon
      const restrictions = config.globalConfig.pokemonRestrictions || {
        blockLegendaries: false,
        blockMythicals: false,
        blockUltraBeasts: false,
        blockParadox: false,
        blockMegas: false,
        blockRestricted: false,
        customBlockedSpecies: [],
        customAllowedSpecies: [],
      };

      // Construir lista de especies bloqueadas
      const blockedSpecies: string[] = [...(restrictions.customBlockedSpecies || [])];
      
      if (restrictions.blockLegendaries) {
        blockedSpecies.push(...Array.from(LEGENDARY_POKEMON));
      }
      if (restrictions.blockMythicals) {
        blockedSpecies.push(...Array.from(MYTHICAL_POKEMON));
      }
      if (restrictions.blockUltraBeasts) {
        blockedSpecies.push(...Array.from(ULTRA_BEASTS));
      }
      if (restrictions.blockParadox) {
        blockedSpecies.push(...Array.from(PARADOX_POKEMON));
      }
      if (restrictions.blockMegas) {
        blockedSpecies.push(...Array.from(MEGA_POKEMON));
      }
      if (restrictions.blockRestricted) {
        blockedSpecies.push(...Array.from(RESTRICTED_POKEMON));
      }

      // Remover duplicados y excepciones permitidas
      const allowedSpecies = restrictions.customAllowedSpecies || [];
      const finalBlockedSpecies = [...new Set(blockedSpecies)]
        .filter(s => !allowedSpecies.includes(s));

      return {
        success: true,
        captureCap,
        ownershipCap,
        appliedRules,
        calculatedAt: new Date(),
        pokemonRestrictions: {
          blockLegendaries: restrictions.blockLegendaries,
          blockMythicals: restrictions.blockMythicals,
          blockUltraBeasts: restrictions.blockUltraBeasts,
          blockParadox: restrictions.blockParadox,
          blockMegas: restrictions.blockMegas,
          blockRestricted: restrictions.blockRestricted,
          blockedSpecies: finalBlockedSpecies,
          allowedSpecies,
        },
      };
    } catch (error) {
      console.error('[LEVEL CAPS SERVICE] Error calculando caps:', error);
      throw Errors.databaseError();
    }
  }

  private evaluateFormula(formula: string, player: User): number {
    try {
      const badges = (player as any).badges || 0;
      const playtime = (player as any).playtime || 0;
      const level = (player as any).level || 1;

      // Use safe FormulaEvaluator instead of eval()
      return FormulaEvaluator.evaluateSafe(formula, { badges, playtime, level });
    } catch (error) {
      console.error('[LEVEL CAPS SERVICE] Formula evaluation error:', error);
      return Infinity;
    }
  }

  private calculateTimeBasedCap(rule: TimeBasedLevelCapRule): number {
    const now = new Date();
    const daysPassed = Math.floor((now.getTime() - new Date(rule.startDate).getTime()) / (1000 * 60 * 60 * 24));

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

    if (rule.maxCap) {
      cap = Math.min(cap, rule.maxCap);
    }

    return cap;
  }

  private matchesConditions(conditions: any, player: User): boolean {
    if (!conditions) return true;

    if (conditions.playerGroups && conditions.playerGroups.length > 0) {
      const playerGroups = (player as any).groups || [];
      if (!conditions.playerGroups.some((g: string) => playerGroups.includes(g))) {
        return false;
      }
    }

    if (conditions.specificPlayers && conditions.specificPlayers.length > 0) {
      if (!conditions.specificPlayers.includes(player.minecraftUuid)) {
        return false;
      }
    }

    if (conditions.badges) {
      const playerBadges = (player as any).badges || 0;
      if (conditions.badges.min !== undefined && playerBadges < conditions.badges.min) return false;
      if (conditions.badges.max !== undefined && playerBadges > conditions.badges.max) return false;
    }

    if (conditions.playtime) {
      const playerPlaytime = (player as any).playtime || 0;
      if (conditions.playtime.min !== undefined && playerPlaytime < conditions.playtime.min) return false;
      if (conditions.playtime.max !== undefined && playerPlaytime > conditions.playtime.max) return false;
    }

    return true;
  }

  async getConfig(): Promise<LevelCapsDocument | null> {
    try {
      return await this.levelCapsCollection.findOne({});
    } catch (error) {
      console.error('[LEVEL CAPS SERVICE] Error obteniendo config:', error);
      throw Errors.databaseError();
    }
  }

  async updateConfig(data: Partial<LevelCapsDocument>, adminName: string): Promise<LevelCapsDocument> {
    try {
      // Validate formulas before saving
      if (data.globalConfig?.defaultCaptureCapFormula) {
        const validation = FormulaEvaluator.validate(data.globalConfig.defaultCaptureCapFormula);
        if (!validation.valid) {
          throw Errors.validationError(`Invalid capture cap formula: ${validation.error}`);
        }
      }

      if (data.globalConfig?.defaultOwnershipCapFormula) {
        const validation = FormulaEvaluator.validate(data.globalConfig.defaultOwnershipCapFormula);
        if (!validation.valid) {
          throw Errors.validationError(`Invalid ownership cap formula: ${validation.error}`);
        }
      }

      const existing = await this.levelCapsCollection.findOne({});

      if (existing) {
        // Increment version on update
        const newVersion = (existing.version || 0) + 1;
        await this.levelCapsCollection.updateOne(
          {},
          {
            $set: {
              ...data,
              version: newVersion,
              lastModified: new Date(),
              modifiedBy: adminName,
              updatedAt: new Date(),
            },
          }
        );
      } else {
        // Initialize version to 1 for new config
        await this.levelCapsCollection.insertOne({
          ...data,
          version: 1,
          lastModified: new Date(),
          modifiedBy: adminName,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as LevelCapsDocument);
      }

      const updated = await this.levelCapsCollection.findOne({});
      if (!updated) {
        throw Errors.databaseError();
      }

      console.log(`[LEVEL CAPS SERVICE] Config updated by ${adminName}, new version: ${updated.version}`);

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[LEVEL CAPS SERVICE] Error actualizando config:', error);
      throw Errors.databaseError();
    }
  }

  async getVersion(): Promise<{ version: number; lastUpdated: Date }> {
    try {
      const config = await this.levelCapsCollection.findOne({});
      return {
        version: config?.version || 1,
        lastUpdated: config?.lastModified || config?.updatedAt || new Date(),
      };
    } catch (error) {
      console.error('[LEVEL CAPS SERVICE] Error obteniendo versión:', error);
      throw Errors.databaseError();
    }
  }
}
