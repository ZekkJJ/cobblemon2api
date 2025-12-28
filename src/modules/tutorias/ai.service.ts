import { IBattleLogDocument, AITutorHistoryModel } from './tutorias.schema';
import { 
  BattleAnalysisResponse, 
  AITutorResponse, 
  BreedAdvisorRequest, 
  BreedAdvisorResponse,
  TurnAnalysis,
  KeyMoment,
  Suggestion
} from '../../shared/types/tutorias.types';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export class AIService {
  private maxRetries = 3;
  private retryDelayMs = 1000;

  /**
   * Analyze a battle and provide strategic insights
   */
  async analyzeBattle(battleLog: IBattleLogDocument): Promise<BattleAnalysisResponse> {
    const prompt = this.buildBattleAnalysisPrompt(battleLog);
    
    const response = await this.callAI(prompt, 'battle_analysis');
    
    return this.parseBattleAnalysisResponse(response, battleLog.battleId);
  }

  /**
   * Answer team-related questions
   */
  async answerTeamQuestion(question: string, teamData: any[] | null): Promise<AITutorResponse> {
    const prompt = this.buildTeamQuestionPrompt(question, teamData);
    
    const response = await this.callAI(prompt, 'team_question');
    
    return this.parseTeamQuestionResponse(response);
  }

  /**
   * Get breeding advice based on Cobbreeding mechanics
   */
  async getBreedingAdvice(request: BreedAdvisorRequest, availablePokemon: any[]): Promise<BreedAdvisorResponse> {
    const prompt = this.buildBreedingAdvicePrompt(request, availablePokemon);
    
    const response = await this.callAI(prompt, 'breeding_advice');
    
    return this.parseBreedingAdviceResponse(response);
  }

  /**
   * Save AI Tutor conversation to history
   */
  async saveAITutorHistory(discordId: string, question: string, response: AITutorResponse, cost: number): Promise<void> {
    await AITutorHistoryModel.create({
      discordId,
      question,
      answer: response.answer,
      teamAnalysis: response.teamAnalysis,
      suggestions: response.suggestions,
      cost
    });
  }

  /**
   * Get AI Tutor history for a user
   */
  async getAITutorHistory(discordId: string, limit: number = 20): Promise<any[]> {
    return AITutorHistoryModel.find({ discordId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Call AI API with retry logic
   */
  private async callAI(prompt: string, context: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.1-70b-versatile',
            messages: [
              {
                role: 'system',
                content: this.getSystemPrompt(context)
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 4000
          })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
      } catch (error) {
        lastError = error as Error;
        console.error(`AI API attempt ${attempt} failed:`, error);
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs * Math.pow(2, attempt - 1));
        }
      }
    }

    throw lastError || new Error('AI service unavailable');
  }

  /**
   * Get system prompt based on context
   */
  private getSystemPrompt(context: string): string {
    const basePrompt = `Eres un experto en Pokémon competitivo y Cobblemon. Respondes en español de manera clara y útil.`;

    switch (context) {
      case 'battle_analysis':
        return `${basePrompt}
Eres un analista de batallas Pokémon. Tu trabajo es:
1. Analizar cada turno de la batalla
2. Identificar momentos clave (buenos y malos)
3. Sugerir jugadas alternativas
4. Dar una calificación general del 1 al 10
5. Proporcionar recomendaciones para mejorar

Responde en formato JSON estructurado.`;

      case 'team_question':
        return `${basePrompt}
Eres un tutor de equipos Pokémon competitivos. Tu trabajo es:
1. Analizar la composición del equipo
2. Identificar fortalezas y debilidades
3. Sugerir mejoras en movesets, items, EVs, naturalezas
4. Explicar el razonamiento detrás de cada sugerencia

Responde en formato JSON estructurado.`;

      case 'breeding_advice':
        return `${basePrompt}
Eres un experto en breeding de Pokémon usando el mod Cobbreeding. Conoces:
- Mecánicas de herencia de IVs (Destiny Knot = 5 IVs, Power Items = 1 IV específico)
- Herencia de naturaleza con Everstone
- Herencia de habilidades (80% madre regular, 60% madre HA)
- Método Masuda (diferentes OTs = x4 shiny odds)
- Método Crystal (padre shiny = x1 bonus por padre shiny)
- Egg groups y compatibilidad

Responde en formato JSON estructurado.`;

      default:
        return basePrompt;
    }
  }

  /**
   * Build prompt for battle analysis
   */
  private buildBattleAnalysisPrompt(battleLog: IBattleLogDocument): string {
    // Determine winner and loser names
    const winnerName = battleLog.winner === battleLog.player1Uuid 
      ? battleLog.player1Username 
      : battleLog.player2Username;
    const loserName = battleLog.winner === battleLog.player1Uuid 
      ? battleLog.player2Username 
      : battleLog.player1Username;
    
    const turnsDescription = battleLog.turns.map(turn => {
      return `Turno ${turn.turnNumber}:
- ${battleLog.player1Username}: ${turn.player1Action.type} ${turn.player1Action.move || turn.player1Action.pokemon || ''}
  ${turn.player1Action.damage ? `Daño: ${turn.player1Action.damage}` : ''}
  ${turn.player1Action.effectiveness ? `Efectividad: ${turn.player1Action.effectiveness}` : ''}
- ${battleLog.player2Username}: ${turn.player2Action.type} ${turn.player2Action.move || turn.player2Action.pokemon || ''}
  ${turn.player2Action.damage ? `Daño: ${turn.player2Action.damage}` : ''}
  ${turn.player2Action.effectiveness ? `Efectividad: ${turn.player2Action.effectiveness}` : ''}
- Campo: ${turn.fieldState.weather || 'Normal'}, ${turn.fieldState.terrain || 'Sin terreno'}`;
    }).join('\n\n');

    return `Analiza esta batalla de Pokémon:

**Jugadores:**
- ${battleLog.player1Username}
- ${battleLog.player2Username}

**Resultado:** ${winnerName} GANÓ la batalla. ${loserName} PERDIÓ.
Método de victoria: ${battleLog.result}

**Duración:** ${battleLog.turnCount} turnos

**Equipos iniciales:**
${battleLog.player1Username}: ${JSON.stringify(battleLog.initialState.player1Team.map((p: any) => p.species || p))}
${battleLog.player2Username}: ${JSON.stringify(battleLog.initialState.player2Team.map((p: any) => p.species || p))}

**Turnos:**
${turnsDescription || 'No hay datos detallados de turnos disponibles.'}

IMPORTANTE: El ganador es ${winnerName}. El perdedor es ${loserName}. No confundas esto.

Responde con un JSON con esta estructura:
{
  "summary": "Resumen de la batalla en 2-3 oraciones. Menciona claramente que ${winnerName} ganó y ${loserName} perdió.",
  "turnByTurn": [{"turn": 1, "analysis": "...", "alternativePlay": "..."}],
  "keyMoments": [{"turn": 1, "description": "...", "impact": "POSITIVE|NEGATIVE|NEUTRAL"}],
  "recommendations": ["recomendación 1", "recomendación 2"],
  "overallRating": 7
}`;
  }

  /**
   * Build prompt for team questions
   */
  private buildTeamQuestionPrompt(question: string, teamData: any[] | null): string {
    let teamContext = '';
    
    if (teamData && teamData.length > 0) {
      teamContext = `\n\n**Equipo actual del jugador:**\n${teamData.map((p, i) => 
        `${i + 1}. ${p.species} (Nivel ${p.level})
   - Naturaleza: ${p.nature}
   - Habilidad: ${p.ability}
   - Movimientos: ${p.moves?.join(', ') || 'Desconocidos'}
   - IVs: HP:${p.ivs?.hp || '?'} Atk:${p.ivs?.attack || '?'} Def:${p.ivs?.defense || '?'} SpA:${p.ivs?.specialAttack || '?'} SpD:${p.ivs?.specialDefense || '?'} Spe:${p.ivs?.speed || '?'}
   - EVs: HP:${p.evs?.hp || 0} Atk:${p.evs?.attack || 0} Def:${p.evs?.defense || 0} SpA:${p.evs?.specialAttack || 0} SpD:${p.evs?.specialDefense || 0} Spe:${p.evs?.speed || 0}
   ${p.shiny ? '⭐ SHINY' : ''}`
      ).join('\n\n')}`;
    }

    return `**Pregunta del jugador:**
${question}
${teamContext}

Responde con un JSON con esta estructura:
{
  "answer": "Tu respuesta detallada aquí",
  "teamAnalysis": {
    "strengths": ["fortaleza 1", "fortaleza 2"],
    "weaknesses": ["debilidad 1", "debilidad 2"],
    "typeChart": {"offensive": {}, "defensive": {}}
  },
  "suggestions": [
    {
      "type": "MOVESET|POKEMON|ITEM|EV_SPREAD|NATURE",
      "target": "Nombre del Pokémon o 'General'",
      "suggestion": "La sugerencia específica",
      "reasoning": "Por qué esta sugerencia ayuda"
    }
  ]
}`;
  }

  /**
   * Build prompt for breeding advice
   */
  private buildBreedingAdvicePrompt(request: BreedAdvisorRequest, availablePokemon: any[]): string {
    const pokemonList = availablePokemon.slice(0, 20).map(p => 
      `- ${p.species} (${p.gender}) IVs: ${Object.values(p.ivs || {}).join('/')} ${p.shiny ? '⭐SHINY' : ''} OT: ${p.originalTrainer || 'Desconocido'}`
    ).join('\n');

    return `**Solicitud de consejo de breeding:**
${request.targetSpecies ? `Especie objetivo: ${request.targetSpecies}` : 'Sin especie específica'}
${request.targetIVs ? `IVs objetivo: ${JSON.stringify(request.targetIVs)}` : ''}
${request.targetNature ? `Naturaleza objetivo: ${request.targetNature}` : ''}
${request.targetAbility ? `Habilidad objetivo: ${request.targetAbility}` : ''}
${request.includeShinyAdvice ? 'Incluir consejos para shiny hunting' : ''}

**Pokémon disponibles del jugador:**
${pokemonList}

**Mecánicas de Cobbreeding a considerar:**
- Destiny Knot: Hereda 5 IVs aleatorios de ambos padres
- Power Items: Garantiza herencia de 1 IV específico
- Everstone: Hereda naturaleza del portador
- Habilidad: 80% de heredar slot de la madre (60% si es HA)
- Método Masuda: Si los padres tienen diferentes OTs, x4 probabilidad shiny
- Método Crystal: Cada padre shiny da x1 bonus a probabilidad shiny

Responde con un JSON con esta estructura:
{
  "breedingPairs": [
    {
      "parent1": {"species": "...", "gender": "...", "ivs": {...}},
      "parent2": {"species": "...", "gender": "...", "ivs": {...}},
      "compatibility": 85,
      "eggGroup": "Field",
      "expectedIVs": {...}
    }
  ],
  "breedingChain": [
    {
      "step": 1,
      "parents": ["Pokémon A", "Pokémon B"],
      "expectedResult": "Descripción del resultado esperado",
      "itemsNeeded": ["Destiny Knot", "Everstone"],
      "notes": "Notas adicionales"
    }
  ],
  "ivInheritance": {
    "guaranteedIVs": 5,
    "destinyKnotEffect": "Hereda 5 IVs aleatorios",
    "powerItemEffect": "Garantiza 1 IV específico"
  },
  "abilityInheritance": {
    "motherAbility": "...",
    "inheritanceChance": 80,
    "hiddenAbilityChance": 60
  },
  "shinyOdds": {
    "baseOdds": "1/8192",
    "masudaBonus": true,
    "crystalBonus": 0,
    "finalOdds": "1/2048",
    "expectedEggs": 2048
  },
  "estimatedEggs": 30
}`;
  }

  /**
   * Parse battle analysis response
   */
  private parseBattleAnalysisResponse(response: string, battleId: string): BattleAnalysisResponse {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        battleId,
        summary: parsed.summary || 'Análisis no disponible',
        turnByTurn: (parsed.turnByTurn || []).map((t: any) => ({
          turn: t.turn,
          playerMove: t.playerMove || { move: '', pokemon: '' },
          opponentMove: t.opponentMove || { move: '', pokemon: '' },
          analysis: t.analysis || '',
          alternativePlay: t.alternativePlay
        })),
        keyMoments: (parsed.keyMoments || []).map((k: any) => ({
          turn: k.turn,
          description: k.description,
          impact: k.impact || 'NEUTRAL'
        })),
        recommendations: parsed.recommendations || [],
        overallRating: Math.min(10, Math.max(1, parsed.overallRating || 5))
      };
    } catch (error) {
      console.error('Error parsing battle analysis:', error);
      return {
        battleId,
        summary: 'Error al analizar la batalla. Por favor intenta de nuevo.',
        turnByTurn: [],
        keyMoments: [],
        recommendations: [],
        overallRating: 5
      };
    }
  }

  /**
   * Parse team question response
   */
  private parseTeamQuestionResponse(response: string): AITutorResponse {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // If no JSON, return the raw response as answer
        return {
          answer: response,
          suggestions: []
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        answer: parsed.answer || response,
        teamAnalysis: parsed.teamAnalysis,
        suggestions: (parsed.suggestions || []).map((s: any) => ({
          type: s.type || 'POKEMON',
          target: s.target || 'General',
          suggestion: s.suggestion || '',
          reasoning: s.reasoning || ''
        }))
      };
    } catch (error) {
      console.error('Error parsing team question:', error);
      return {
        answer: response,
        suggestions: []
      };
    }
  }

  /**
   * Parse breeding advice response
   */
  private parseBreedingAdviceResponse(response: string): BreedAdvisorResponse {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        breedingPairs: parsed.breedingPairs || [],
        breedingChain: parsed.breedingChain || [],
        ivInheritance: parsed.ivInheritance || {
          guaranteedIVs: 5,
          destinyKnotEffect: 'Hereda 5 IVs aleatorios de ambos padres',
          powerItemEffect: 'Garantiza herencia de 1 IV específico'
        },
        abilityInheritance: parsed.abilityInheritance || {
          motherAbility: 'Unknown',
          inheritanceChance: 80
        },
        shinyOdds: parsed.shinyOdds,
        estimatedEggs: parsed.estimatedEggs || 30
      };
    } catch (error) {
      console.error('Error parsing breeding advice:', error);
      return {
        breedingPairs: [],
        breedingChain: [],
        ivInheritance: {
          guaranteedIVs: 5,
          destinyKnotEffect: 'Hereda 5 IVs aleatorios de ambos padres',
          powerItemEffect: 'Garantiza herencia de 1 IV específico'
        },
        abilityInheritance: {
          motherAbility: 'Unknown',
          inheritanceChance: 80
        },
        estimatedEggs: 30
      };
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
