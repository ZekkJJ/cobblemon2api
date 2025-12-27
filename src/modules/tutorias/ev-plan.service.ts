import { EVPlanModel, IEVPlanDocument } from './tutorias.schema';
import { EVPlan, PokemonStats } from '../../shared/types/tutorias.types';
import { StatCalculatorService } from './stat-calculator.service';

export class EVPlanService {
  private statCalculator: StatCalculatorService;

  constructor() {
    this.statCalculator = new StatCalculatorService();
  }

  /**
   * Save an EV plan for a Pokemon
   * Property 15: EV Plan Round Trip - saving and retrieving returns same data
   */
  async saveEVPlan(discordId: string, plan: Omit<EVPlan, 'savedAt'>): Promise<IEVPlanDocument> {
    // Validate EV distribution
    const validation = this.statCalculator.validateEVDistribution(plan.evDistribution);
    if (!validation.valid) {
      throw new Error(`Invalid EV distribution: ${validation.errors.join(', ')}`);
    }

    const result = await EVPlanModel.findOneAndUpdate(
      { discordId, pokemonUuid: plan.pokemonUuid },
      {
        $set: {
          pokemonSpecies: plan.pokemonSpecies,
          evDistribution: plan.evDistribution,
          projectedStats50: plan.projectedStats50,
          projectedStats100: plan.projectedStats100,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    return result;
  }

  /**
   * Get an EV plan for a Pokemon
   */
  async getEVPlan(discordId: string, pokemonUuid: string): Promise<EVPlan | null> {
    const plan = await EVPlanModel.findOne({ discordId, pokemonUuid });
    
    if (!plan) return null;

    return {
      pokemonUuid: plan.pokemonUuid,
      pokemonSpecies: plan.pokemonSpecies,
      evDistribution: plan.evDistribution,
      projectedStats50: plan.projectedStats50,
      projectedStats100: plan.projectedStats100,
      savedAt: plan.updatedAt.toISOString()
    };
  }

  /**
   * Get all EV plans for a user
   */
  async getAllEVPlans(discordId: string): Promise<EVPlan[]> {
    const plans = await EVPlanModel.find({ discordId }).sort({ updatedAt: -1 });
    
    return plans.map(plan => ({
      pokemonUuid: plan.pokemonUuid,
      pokemonSpecies: plan.pokemonSpecies,
      evDistribution: plan.evDistribution,
      projectedStats50: plan.projectedStats50,
      projectedStats100: plan.projectedStats100,
      savedAt: plan.updatedAt.toISOString()
    }));
  }

  /**
   * Delete an EV plan
   */
  async deleteEVPlan(discordId: string, pokemonUuid: string): Promise<boolean> {
    const result = await EVPlanModel.deleteOne({ discordId, pokemonUuid });
    return result.deletedCount > 0;
  }

  /**
   * Calculate projected stats for a Pokemon with given EV distribution
   */
  calculateProjectedStats(pokemon: any, evDistribution: PokemonStats): { level50: PokemonStats; level100: PokemonStats } {
    return {
      level50: this.statCalculator.calculateStats(pokemon, evDistribution, 50),
      level100: this.statCalculator.calculateStats(pokemon, evDistribution, 100)
    };
  }

  /**
   * Get EV plan suggestions based on Pokemon and role
   */
  async getEVPlanSuggestions(pokemon: any): Promise<{
    role: string;
    evDistribution: PokemonStats;
    projectedStats50: PokemonStats;
    projectedStats100: PokemonStats;
    reasoning: string;
  }[]> {
    const suggestions: {
      role: string;
      evDistribution: PokemonStats;
      projectedStats50: PokemonStats;
      projectedStats100: PokemonStats;
      reasoning: string;
    }[] = [];

    const roles: { role: string; type: 'physical_attacker' | 'special_attacker' | 'physical_wall' | 'special_wall' | 'mixed' | 'speed'; reasoning: string }[] = [
      { role: 'Atacante Físico', type: 'physical_attacker', reasoning: 'Maximiza Ataque y Velocidad para golpear primero y fuerte' },
      { role: 'Atacante Especial', type: 'special_attacker', reasoning: 'Maximiza Ataque Especial y Velocidad para barridos especiales' },
      { role: 'Muro Físico', type: 'physical_wall', reasoning: 'Maximiza HP y Defensa para tanquear ataques físicos' },
      { role: 'Muro Especial', type: 'special_wall', reasoning: 'Maximiza HP y Defensa Especial para tanquear ataques especiales' }
    ];

    for (const { role, type, reasoning } of roles) {
      const evDistribution = this.statCalculator.suggestEVSpread(pokemon, type);
      const { level50, level100 } = this.calculateProjectedStats(pokemon, evDistribution);

      suggestions.push({
        role,
        evDistribution,
        projectedStats50: level50,
        projectedStats100: level100,
        reasoning
      });
    }

    return suggestions;
  }

  /**
   * Compare two EV distributions
   */
  compareEVDistributions(
    pokemon: any,
    distribution1: PokemonStats,
    distribution2: PokemonStats
  ): {
    stats1: { level50: PokemonStats; level100: PokemonStats };
    stats2: { level50: PokemonStats; level100: PokemonStats };
    differences: Record<keyof PokemonStats, { level50: number; level100: number }>;
  } {
    const stats1 = this.calculateProjectedStats(pokemon, distribution1);
    const stats2 = this.calculateProjectedStats(pokemon, distribution2);

    const statKeys: (keyof PokemonStats)[] = ['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'];
    const differences: Record<keyof PokemonStats, { level50: number; level100: number }> = {} as any;

    for (const stat of statKeys) {
      differences[stat] = {
        level50: stats2.level50[stat] - stats1.level50[stat],
        level100: stats2.level100[stat] - stats1.level100[stat]
      };
    }

    return { stats1, stats2, differences };
  }

  /**
   * Get total EVs used in a distribution
   */
  getTotalEVs(evDistribution: PokemonStats): number {
    return evDistribution.hp + evDistribution.attack + evDistribution.defense + 
           evDistribution.specialAttack + evDistribution.specialDefense + evDistribution.speed;
  }

  /**
   * Clean up old EV plans (for Pokemon that no longer exist)
   */
  async cleanupOrphanedPlans(discordId: string, validPokemonUuids: string[]): Promise<number> {
    const result = await EVPlanModel.deleteMany({
      discordId,
      pokemonUuid: { $nin: validPokemonUuids }
    });
    return result.deletedCount;
  }
}
