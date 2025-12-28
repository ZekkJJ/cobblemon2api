/**
 * Tutorías Routes - Legacy JavaScript Version
 * Endpoints for the tutorías system (pricing, cooldowns, etc.)
 */

const express = require('express');

// Default pricing configuration - PRECIOS MÁS ALTOS
const DEFAULT_PRICING = {
  aiTutor: {
    basePrice: 2000,        // Subido de 500 a 2000
    perQuestionPrice: 500,  // Subido de 100 a 500
    dailyFreeQuestions: 2,  // Reducido de 3 a 2
    maxQuestionsPerDay: 15
  },
  battleAnalysis: {
    basePrice: 3000,        // Subido de 1000 a 3000
    perAnalysisPrice: 1000, // Subido de 250 a 1000
    dailyFreeAnalyses: 1,
    maxAnalysesPerDay: 5
  },
  breedAdvisor: {
    basePrice: 2500,        // Subido de 750 a 2500
    perAdvicePrice: 750,    // Subido de 150 a 750
    dailyFreeAdvices: 1,    // Reducido de 2 a 1
    maxAdvicesPerDay: 10
  },
  evPlanner: {
    basePrice: 1000,        // Subido de 300 a 1000
    perPlanPrice: 250,      // Subido de 50 a 250
    dailyFreePlans: 3,      // Reducido de 5 a 3
    maxPlansPerDay: 20
  },
  pokebox: {
    basePrice: 0,
    perAccessPrice: 0,
    dailyFreeAccesses: -1,
    maxAccessesPerDay: -1
  }
};

// Default cooldowns (in seconds)
const DEFAULT_COOLDOWNS = {
  aiTutor: 60,        // Subido de 30 a 60
  battleAnalysis: 120, // Subido de 60 a 120
  breedAdvisor: 90,   // Subido de 45 a 90
  evPlanner: 30,      // Subido de 15 a 30
  pokebox: 0
};

// GROQ API Key from environment
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

/**
 * Call Groq LLM API for AI Tutor responses
 */
async function callGroqForTutor(question, teamData = null) {
  if (!GROQ_API_KEY) {
    console.log('[AI TUTOR] No GROQ API key configured');
    return null;
  }

  try {
    const systemPrompt = `Eres un experto tutor de Pokémon competitivo para un servidor de Cobblemon (Minecraft). 
Tu trabajo es ayudar a los jugadores con:
- Estrategias de batalla y teambuilding
- Movesets óptimos para Pokémon
- Consejos de EVs/IVs y naturalezas
- Counters y matchups
- Breeding y shiny hunting
- Mecánicas de Cobblemon específicas

Responde en español de forma clara y concisa. Usa emojis para hacer la respuesta más amigable.
Si el jugador proporciona datos de su equipo, úsalos para dar consejos personalizados.
Limita tus respuestas a 300 palabras máximo.`;

    const userMessage = teamData 
      ? `Mi equipo actual: ${JSON.stringify(teamData)}\n\nMi pregunta: ${question}`
      : question;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      console.error('[AI TUTOR] Groq API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('[AI TUTOR] Error calling Groq:', error.message);
    return null;
  }
}

function initTutoriasRoutes(getDb) {
  const router = express.Router();

  // ============================================
  // PRICING & COOLDOWNS
  // ============================================

  // GET /api/tutorias/pricing
  router.get('/pricing', async (req, res) => {
    try {
      const db = getDb();
      const { discordId } = req.query;
      
      let pricing = await db.collection('tutorias_config').findOne({ type: 'pricing' });
      pricing = pricing?.config || DEFAULT_PRICING;
      
      // Get user balance if discordId provided
      let userBalance = 0;
      if (discordId) {
        const user = await db.collection('users').findOne({ discordId });
        userBalance = user?.cobbleDollars || 0;
      }
      
      res.json({ success: true, pricing, userBalance });
    } catch (error) {
      console.error('[TUTORIAS] Error getting pricing:', error);
      res.json({ success: true, pricing: DEFAULT_PRICING, userBalance: 0 });
    }
  });

  // GET /api/tutorias/cooldowns
  router.get('/cooldowns', async (req, res) => {
    try {
      const db = getDb();
      let cooldowns = await db.collection('tutorias_config').findOne({ type: 'cooldowns' });
      cooldowns = cooldowns?.config || DEFAULT_COOLDOWNS;
      res.json({ success: true, cooldowns });
    } catch (error) {
      console.error('[TUTORIAS] Error getting cooldowns:', error);
      res.json({ success: true, cooldowns: DEFAULT_COOLDOWNS });
    }
  });

  // ============================================
  // BATTLE ANALYSIS
  // ============================================

  // GET /api/tutorias/battle-analysis/history
  router.get('/battle-analysis/history', async (req, res) => {
    try {
      const { discordId } = req.query;
      const db = getDb();
      
      const battles = await db.collection('battle_analyses')
        .find(discordId ? { discordId } : {})
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

      res.json({ success: true, battles });
    } catch (error) {
      console.error('[TUTORIAS] Error getting battle history:', error);
      res.json({ success: true, battles: [] });
    }
  });

  // POST /api/tutorias/battle-analysis/request
  router.post('/battle-analysis/request', async (req, res) => {
    try {
      const { battleId, discordId } = req.body;
      
      res.json({
        success: true,
        analysis: {
          battleId,
          status: 'pending',
          message: 'Análisis de batalla en cola. Estará disponible pronto.'
        }
      });
    } catch (error) {
      console.error('[TUTORIAS] Error requesting battle analysis:', error);
      res.status(500).json({ success: false, error: 'Error al solicitar análisis' });
    }
  });

  // GET /api/tutorias/battle-analysis/:battleId
  router.get('/battle-analysis/:battleId', async (req, res) => {
    try {
      const { battleId } = req.params;
      const db = getDb();
      
      const battle = await db.collection('battle_analyses').findOne({ battleId });
      
      if (!battle) {
        return res.json({
          success: true,
          battle: {
            battleId,
            status: 'not_found',
            analysisResult: null
          }
        });
      }

      res.json({ success: true, battle });
    } catch (error) {
      console.error('[TUTORIAS] Error getting battle analysis:', error);
      res.status(500).json({ success: false, error: 'Error al obtener análisis' });
    }
  });

  // ============================================
  // AI TUTOR
  // ============================================

  // POST /api/tutorias/ai-tutor/ask
  router.post('/ai-tutor/ask', async (req, res) => {
    try {
      const { question, includeTeamData, discordId } = req.body;
      const db = getDb();
      
      if (!question) {
        return res.status(400).json({ success: false, error: 'Pregunta requerida' });
      }

      // Get user's team data if requested
      let teamData = null;
      if (includeTeamData && discordId) {
        const user = await db.collection('users').findOne({ discordId });
        if (user?.party) {
          teamData = user.party.map(p => ({
            species: p.species,
            level: p.level,
            nature: p.nature,
            ability: p.ability,
            moves: p.moves
          }));
        }
      }

      // Try to get AI response from Groq
      const aiAnswer = await callGroqForTutor(question, teamData);
      
      if (aiAnswer) {
        // Save to history
        await db.collection('ai_tutor_history').insertOne({
          discordId,
          question,
          answer: aiAnswer,
          includeTeamData,
          createdAt: new Date()
        });

        res.json({
          success: true,
          response: {
            answer: aiAnswer,
            confidence: 0.9,
            sources: ['Cobblemon Wiki', 'Smogon', 'Pokémon Database'],
            aiPowered: true
          }
        });
      } else {
        // Fallback response if AI is unavailable
        res.json({
          success: true,
          response: {
            answer: `🤖 El servicio de IA está temporalmente no disponible. Tu pregunta fue: "${question}"\n\n📚 Mientras tanto, te recomiendo:\n• Consultar la wiki de Cobblemon\n• Preguntar en el Discord del servidor\n• Revisar guías de Smogon para estrategias competitivas`,
            confidence: 0.5,
            sources: ['Cobblemon Wiki', 'Discord'],
            aiPowered: false
          }
        });
      }
    } catch (error) {
      console.error('[TUTORIAS] Error in AI ask:', error);
      res.status(500).json({ success: false, error: 'Error al procesar pregunta' });
    }
  });

  // GET /api/tutorias/ai-tutor/history
  router.get('/ai-tutor/history', async (req, res) => {
    try {
      const { discordId } = req.query;
      const db = getDb();
      
      const history = await db.collection('ai_tutor_history')
        .find(discordId ? { discordId } : {})
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

      res.json({ success: true, history });
    } catch (error) {
      console.error('[TUTORIAS] Error getting AI history:', error);
      res.json({ success: true, history: [] });
    }
  });

  // ============================================
  // BREED ADVISOR
  // ============================================

  // POST /api/tutorias/breed-advisor/ask
  router.post('/breed-advisor/ask', async (req, res) => {
    try {
      const { targetSpecies, targetIVs, targetNature, targetAbility, includeShinyAdvice } = req.body;
      
      res.json({
        success: true,
        advice: {
          targetSpecies: targetSpecies || 'Any',
          compatibility: true,
          eggGroups: ['Field', 'Monster'],
          estimatedIVs: targetIVs || { hp: '20-31', attack: '25-31', defense: '15-31', spAtk: '10-31', spDef: '20-31', speed: '25-31' },
          recommendedNature: targetNature || 'Jolly',
          suggestions: [
            'Usa un Ditto con IVs altos para mejores resultados',
            'Considera usar objetos de poder para pasar IVs específicos',
            'El Destiny Knot pasa 5 IVs aleatorios de los padres',
            targetAbility ? `Para obtener ${targetAbility}, asegúrate de que uno de los padres la tenga` : null,
            includeShinyAdvice ? 'Para aumentar probabilidad de shiny, usa el Método Masuda (padres de diferentes regiones)' : null
          ].filter(Boolean),
          shinyOdds: includeShinyAdvice ? '1/683 con Masuda Method' : null
        }
      });
    } catch (error) {
      console.error('[TUTORIAS] Error in breed advice:', error);
      res.status(500).json({ success: false, error: 'Error al obtener consejos' });
    }
  });

  // ============================================
  // POKEBOX
  // ============================================

  /**
   * Normalize Pokemon data to ensure consistent structure
   * Handles different field naming conventions from Cobblemon
   */
  function normalizePokemon(p) {
    if (!p) return null;
    
    // Normalize IVs - handle different formats (spAttack vs specialAttack, etc.)
    const normalizeStats = (stats) => {
      if (!stats) return { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };
      return {
        hp: stats.hp ?? stats.HP ?? stats.Hp ?? 0,
        attack: stats.attack ?? stats.Attack ?? stats.atk ?? stats.ATK ?? 0,
        defense: stats.defense ?? stats.Defense ?? stats.def ?? stats.DEF ?? 0,
        specialAttack: stats.specialAttack ?? stats.spAttack ?? stats.special_attack ?? stats.SpAtk ?? stats.spAtk ?? stats.spa ?? 0,
        specialDefense: stats.specialDefense ?? stats.spDefense ?? stats.special_defense ?? stats.SpDef ?? stats.spDef ?? stats.spd ?? 0,
        speed: stats.speed ?? stats.Speed ?? stats.spe ?? stats.SPE ?? 0
      };
    };

    const ivs = normalizeStats(p.ivs);
    const evs = normalizeStats(p.evs);
    
    // Calculate IV percentage
    const ivTotal = ivs.hp + ivs.attack + ivs.defense + ivs.specialAttack + ivs.specialDefense + ivs.speed;
    const ivPercentage = (ivTotal / 186) * 100;
    
    // Calculate EV remaining
    const evTotal = evs.hp + evs.attack + evs.defense + evs.specialAttack + evs.specialDefense + evs.speed;
    const evRemaining = 510 - evTotal;

    // Normalize moves - can be array of strings or array of objects with name
    const normalizeMoves = (moves) => {
      if (!Array.isArray(moves)) return [];
      return moves.map(m => {
        if (typeof m === 'string') return m;
        if (m && m.name) return m.name;
        return 'Unknown';
      });
    };

    return {
      uuid: p.uuid || p.id || `pokemon-${Date.now()}-${Math.random()}`,
      species: p.species || p.name || 'Unknown',
      nickname: p.nickname || null,
      level: p.level || 1,
      nature: p.nature || 'Hardy',
      ability: p.ability || 'Unknown',
      moves: normalizeMoves(p.moves),
      ivs,
      evs,
      shiny: p.shiny === true || p.isShiny === true,
      ivPercentage,
      evRemaining,
      isProtected: p.protected === true || p.isProtected === true,
      heldItem: p.heldItem || p.held_item || null,
      gender: p.gender || 'Unknown'
    };
  }

  /**
   * Extract all Pokemon from pcStorage structure
   * pcStorage can be:
   * - Array of Pokemon directly
   * - Array of boxes: [{ boxNumber, pokemon: [...] }]
   */
  function extractPokemonFromStorage(pcStorage) {
    if (!Array.isArray(pcStorage)) return [];
    
    const allPokemon = [];
    
    for (const item of pcStorage) {
      // Check if it's a box structure { boxNumber, pokemon: [...] }
      if (item && Array.isArray(item.pokemon)) {
        allPokemon.push(...item.pokemon);
      } 
      // Check if it's a direct Pokemon object (has species or uuid)
      else if (item && (item.species || item.uuid)) {
        allPokemon.push(item);
      }
    }
    
    return allPokemon;
  }

  // GET /api/tutorias/pokebox
  router.get('/pokebox', async (req, res) => {
    try {
      const { discordId, species, shiny, ivMin, ivMax, nature, ability, levelMin, levelMax } = req.query;
      const db = getDb();
      
      // Get user by discord ID
      let user = null;
      if (discordId) {
        user = await db.collection('users').findOne({ discordId });
      }
      
      if (!user) {
        return res.json({ success: true, pokemon: [], party: [] });
      }

      // Extract and normalize all pokemon data
      const rawPcPokemon = extractPokemonFromStorage(user.pcStorage || []);
      let pcStorage = rawPcPokemon.map(normalizePokemon).filter(p => p !== null);
      let party = (user.party || []).map(normalizePokemon).filter(p => p !== null);

      // Apply filters
      if (species) {
        const speciesLower = species.toLowerCase();
        pcStorage = pcStorage.filter(p => p.species?.toLowerCase().includes(speciesLower));
      }
      if (shiny === 'true') {
        pcStorage = pcStorage.filter(p => p.shiny === true);
      }
      if (nature) {
        pcStorage = pcStorage.filter(p => p.nature?.toLowerCase() === nature.toLowerCase());
      }
      if (ability) {
        pcStorage = pcStorage.filter(p => p.ability?.toLowerCase().includes(ability.toLowerCase()));
      }
      if (levelMin) {
        pcStorage = pcStorage.filter(p => (p.level || 1) >= parseInt(levelMin));
      }
      if (levelMax) {
        pcStorage = pcStorage.filter(p => (p.level || 1) <= parseInt(levelMax));
      }

      res.json({
        success: true,
        pokemon: pcStorage,
        party: party,
        total: pcStorage.length
      });
    } catch (error) {
      console.error('[TUTORIAS] Error getting pokebox:', error);
      res.status(500).json({ success: false, error: 'Error al obtener pokebox' });
    }
  });

  // GET /api/tutorias/pokebox/duplicates
  router.get('/pokebox/duplicates', async (req, res) => {
    try {
      const { discordId } = req.query;
      const db = getDb();
      
      let user = null;
      if (discordId) {
        user = await db.collection('users').findOne({ discordId });
      }
      
      if (!user || !user.pcStorage) {
        return res.json({ success: true, duplicates: [] });
      }

      // Extract and normalize all pokemon data
      const rawPcPokemon = extractPokemonFromStorage(user.pcStorage || []);
      const normalizedPokemon = rawPcPokemon.map(normalizePokemon).filter(p => p !== null);

      // Find duplicates by species
      const speciesCount = {};
      normalizedPokemon.forEach(p => {
        const species = p.species || 'Unknown';
        if (!speciesCount[species]) {
          speciesCount[species] = [];
        }
        speciesCount[species].push(p);
      });

      const duplicates = Object.entries(speciesCount)
        .filter(([_, pokemon]) => pokemon.length > 1)
        .map(([species, pokemon]) => {
          // Find the best one to keep (highest IV percentage)
          const sorted = [...pokemon].sort((a, b) => b.ivPercentage - a.ivPercentage);
          return {
            species,
            count: pokemon.length,
            pokemon,
            suggestedKeep: sorted[0]?.uuid
          };
        });

      res.json({ success: true, duplicates });
    } catch (error) {
      console.error('[TUTORIAS] Error getting duplicates:', error);
      res.status(500).json({ success: false, error: 'Error al obtener duplicados' });
    }
  });

  // POST /api/tutorias/pokebox/protect
  router.post('/pokebox/protect', async (req, res) => {
    try {
      const { pokemonUuid, protected: isProtected, discordId } = req.body;
      const db = getDb();
      
      // Update protection status in user's pcStorage
      await db.collection('users').updateOne(
        { discordId, 'pcStorage.uuid': pokemonUuid },
        { $set: { 'pcStorage.$.protected': isProtected } }
      );

      res.json({ success: true, message: isProtected ? 'Pokémon protegido' : 'Protección removida' });
    } catch (error) {
      console.error('[TUTORIAS] Error updating protection:', error);
      res.status(500).json({ success: false, error: 'Error al actualizar protección' });
    }
  });

  // ============================================
  // STAT PLANNER / EV PLANNER
  // ============================================

  // POST /api/tutorias/stat-planner/save
  router.post('/stat-planner/save', async (req, res) => {
    try {
      const { pokemonUuid, pokemonSpecies, evDistribution, discordId } = req.body;
      const db = getDb();
      
      await db.collection('ev_plans').updateOne(
        { pokemonUuid },
        {
          $set: {
            pokemonUuid,
            pokemonSpecies,
            evDistribution,
            discordId,
            updatedAt: new Date()
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );

      res.json({ success: true, message: 'Plan guardado' });
    } catch (error) {
      console.error('[TUTORIAS] Error saving EV plan:', error);
      res.status(500).json({ success: false, error: 'Error al guardar plan' });
    }
  });

  // GET /api/tutorias/stat-planner/:pokemonUuid
  router.get('/stat-planner/:pokemonUuid', async (req, res) => {
    try {
      const { pokemonUuid } = req.params;
      const db = getDb();
      
      const plan = await db.collection('ev_plans').findOne({ pokemonUuid });
      
      if (!plan) {
        return res.json({
          success: true,
          plan: null
        });
      }

      res.json({ success: true, plan });
    } catch (error) {
      console.error('[TUTORIAS] Error getting EV plan:', error);
      res.status(500).json({ success: false, error: 'Error al obtener plan' });
    }
  });

  // POST /api/tutorias/ev/plan (legacy endpoint)
  router.post('/ev/plan', async (req, res) => {
    try {
      const { pokemon, targetSpread } = req.body;
      
      res.json({
        success: true,
        plan: {
          targetSpread: targetSpread || { hp: 0, attack: 252, defense: 0, spAtk: 0, spDef: 4, speed: 252 },
          trainingSpots: [
            { stat: 'attack', location: 'Route 1', pokemon: 'Rattata', evYield: 1 },
            { stat: 'speed', location: 'Route 2', pokemon: 'Pidgey', evYield: 1 }
          ],
          estimatedTime: '2-3 hours',
          tips: [
            'Usa Pokérus para duplicar los EVs ganados',
            'Los objetos de poder dan +8 EVs adicionales'
          ]
        }
      });
    } catch (error) {
      console.error('[TUTORIAS] Error in EV plan:', error);
      res.status(500).json({ success: false, error: 'Error al crear plan' });
    }
  });

  // ============================================
  // BATTLE LOG CAPTURE (from Plugin)
  // ============================================

  // POST /api/tutorias/battle-log/store - Store battle log from plugin
  router.post('/battle-log/store', async (req, res) => {
    try {
      const db = getDb();
      const {
        battleId,
        cobblemonBattleId,
        startTime,
        endTime,
        duration,
        totalTurns,
        result,
        winnerUuid,
        loserUuid,
        player1,
        player2,
        turns
      } = req.body;

      if (!battleId || !winnerUuid || !loserUuid) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      // Find discord IDs for players by their Minecraft UUIDs
      const winnerUser = await db.collection('users').findOne({ minecraftUuid: winnerUuid });
      const loserUser = await db.collection('users').findOne({ minecraftUuid: loserUuid });

      // Determine which player data corresponds to winner/loser
      // The plugin sends player1.isWinner and player2.isWinner flags
      let winnerTeam, loserTeam;
      
      if (player1?.uuid === winnerUuid || player1?.isWinner) {
        winnerTeam = player1?.team || [];
        loserTeam = player2?.team || [];
      } else if (player2?.uuid === winnerUuid || player2?.isWinner) {
        winnerTeam = player2?.team || [];
        loserTeam = player1?.team || [];
      } else {
        // Fallback: use player1 as winner team, player2 as loser team
        winnerTeam = player1?.team || [];
        loserTeam = player2?.team || [];
      }

      const battleLog = {
        battleId,
        cobblemonBattleId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration,
        totalTurns,
        result,
        winner: {
          uuid: winnerUuid,
          discordId: winnerUser?.discordId || null,
          username: winnerUser?.username || winnerUser?.minecraftUsername || null,
          team: winnerTeam
        },
        loser: {
          uuid: loserUuid,
          discordId: loserUser?.discordId || null,
          username: loserUser?.username || loserUser?.minecraftUsername || null,
          team: loserTeam
        },
        turns: turns || [],
        analyzed: false,
        analysisResult: null,
        createdAt: new Date()
      };

      await db.collection('battle_logs').insertOne(battleLog);

      // Create battle_analyses entries for BOTH players so each can see the battle in their history
      const winnerAnalysis = {
        battleId,
        discordId: winnerUser?.discordId,
        minecraftUuid: winnerUuid,
        date: new Date(),
        opponent: loserUser?.username || loserUser?.minecraftUsername || loserUuid,
        opponentUuid: loserUuid,
        result: 'WIN',
        duration: Math.floor(duration / 1000),
        turns: totalTurns,
        analyzed: false,
        createdAt: new Date()
      };

      const loserAnalysis = {
        battleId,
        discordId: loserUser?.discordId,
        minecraftUuid: loserUuid,
        date: new Date(),
        opponent: winnerUser?.username || winnerUser?.minecraftUsername || winnerUuid,
        opponentUuid: winnerUuid,
        result: 'LOSS',
        duration: Math.floor(duration / 1000),
        turns: totalTurns,
        analyzed: false,
        createdAt: new Date()
      };

      // Insert both entries
      if (winnerUser?.discordId) {
        await db.collection('battle_analyses').insertOne(winnerAnalysis);
      }
      if (loserUser?.discordId) {
        await db.collection('battle_analyses').insertOne(loserAnalysis);
      }

      console.log(`[BATTLE LOG] Stored battle ${battleId}: ${winnerUuid} (WIN) vs ${loserUuid} (LOSS) - ${result}`);

      res.json({ success: true, message: 'Battle log stored', battleId });
    } catch (error) {
      console.error('[TUTORIAS] Error storing battle log:', error);
      res.status(500).json({ success: false, error: 'Error storing battle log' });
    }
  });

  // GET /api/tutorias/battle-log/list - Get battle logs for a player
  router.get('/battle-log/list', async (req, res) => {
    try {
      const { discordId, minecraftUuid, limit = 20 } = req.query;
      const db = getDb();

      let query = {};
      if (discordId) {
        query.$or = [
          { 'winner.discordId': discordId },
          { 'loser.discordId': discordId }
        ];
      } else if (minecraftUuid) {
        query.$or = [
          { 'winner.uuid': minecraftUuid },
          { 'loser.uuid': minecraftUuid }
        ];
      }

      const battles = await db.collection('battle_logs')
        .find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .toArray();

      res.json({ success: true, battles });
    } catch (error) {
      console.error('[TUTORIAS] Error getting battle logs:', error);
      res.json({ success: true, battles: [] });
    }
  });

  // GET /api/tutorias/battle-log/:battleId - Get specific battle log
  router.get('/battle-log/:battleId', async (req, res) => {
    try {
      const { battleId } = req.params;
      const db = getDb();

      const battle = await db.collection('battle_logs').findOne({ battleId });

      if (!battle) {
        return res.json({ success: false, error: 'Battle not found' });
      }

      res.json({ success: true, battle });
    } catch (error) {
      console.error('[TUTORIAS] Error getting battle log:', error);
      res.status(500).json({ success: false, error: 'Error getting battle log' });
    }
  });

  // POST /api/tutorias/battle-log/analyze - Request AI analysis of a battle
  router.post('/battle-log/analyze', async (req, res) => {
    try {
      const { battleId, discordId } = req.body;
      const db = getDb();

      const battle = await db.collection('battle_logs').findOne({ battleId });

      if (!battle) {
        return res.status(404).json({ success: false, error: 'Battle not found' });
      }

      if (battle.analyzed && battle.analysisResult) {
        return res.json({ success: true, analysis: battle.analysisResult, cached: true });
      }

      // Call Groq for battle analysis
      if (!GROQ_API_KEY) {
        return res.json({ 
          success: false, 
          error: 'AI analysis not available',
          message: 'El servicio de análisis AI no está configurado'
        });
      }

      // Determine who is requesting the analysis
      const isRequesterWinner = discordId === battle.winner.discordId;
      const requesterTeam = isRequesterWinner ? battle.winner : battle.loser;
      const opponentTeam = isRequesterWinner ? battle.loser : battle.winner;
      const requesterResult = isRequesterWinner ? 'GANÓ' : 'PERDIÓ';

      const analysisPrompt = `Analiza esta batalla Pokémon y proporciona consejos para el jugador que solicita el análisis.

=== INFORMACIÓN IMPORTANTE ===
El jugador que solicita el análisis es: ${requesterTeam.username || requesterTeam.uuid}
Este jugador ${requesterResult} la batalla.

=== DATOS DE LA BATALLA ===
GANADOR de la batalla: ${battle.winner.username || battle.winner.uuid}
Equipo del GANADOR: ${JSON.stringify(battle.winner.team?.map(p => p.species || p) || [])}

PERDEDOR de la batalla: ${battle.loser.username || battle.loser.uuid}
Equipo del PERDEDOR: ${JSON.stringify(battle.loser.team?.map(p => p.species || p) || [])}

Resultado: ${battle.result}
Turnos totales: ${battle.totalTurns}
Duración: ${Math.floor(battle.duration / 1000)} segundos

=== INSTRUCCIONES ===
1. El GANADOR es ${battle.winner.username || battle.winner.uuid}. El PERDEDOR es ${battle.loser.username || battle.loser.uuid}. NO confundas esto.
2. El jugador que solicita el análisis ${requesterResult} la batalla.
3. Proporciona consejos personalizados para ${requesterTeam.username || requesterTeam.uuid}.

Proporciona:
1. Resumen de la batalla (menciona claramente quién ganó y quién perdió)
2. Momentos clave (si hay datos de turnos disponibles)
3. ${isRequesterWinner ? 'Qué hizo bien el ganador' : 'Errores que cometió el perdedor'}
4. Consejos de mejora para ${requesterTeam.username || requesterTeam.uuid}
5. Puntuación general (1-10)

Responde en español, de forma concisa y útil. RECUERDA: ${battle.winner.username || battle.winner.uuid} GANÓ, ${battle.loser.username || battle.loser.uuid} PERDIÓ.`;

      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'Eres un experto analista de batallas Pokémon competitivas.' },
              { role: 'user', content: analysisPrompt }
            ],
            temperature: 0.7,
            max_tokens: 1500,
          }),
        });

        if (!response.ok) {
          throw new Error('Groq API error');
        }

        const data = await response.json();
        const analysisText = data.choices[0]?.message?.content;

        if (analysisText) {
          // Save analysis
          await db.collection('battle_logs').updateOne(
            { battleId },
            { 
              $set: { 
                analyzed: true, 
                analysisResult: analysisText,
                analyzedAt: new Date()
              } 
            }
          );

          // Also update battle_analyses
          await db.collection('battle_analyses').updateOne(
            { battleId },
            { $set: { analyzed: true, analysisResult: analysisText } }
          );

          res.json({ success: true, analysis: analysisText, cached: false });
        } else {
          res.json({ success: false, error: 'No analysis generated' });
        }
      } catch (aiError) {
        console.error('[TUTORIAS] AI analysis error:', aiError);
        res.json({ success: false, error: 'AI analysis failed' });
      }
    } catch (error) {
      console.error('[TUTORIAS] Error analyzing battle:', error);
      res.status(500).json({ success: false, error: 'Error analyzing battle' });
    }
  });

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  // PUT /api/tutorias/admin/pricing
  router.put('/admin/pricing', async (req, res) => {
    try {
      const { pricing } = req.body;
      const db = getDb();
      
      await db.collection('tutorias_config').updateOne(
        { type: 'pricing' },
        { 
          $set: { config: pricing, updatedAt: new Date() },
          $setOnInsert: { type: 'pricing', createdAt: new Date() }
        },
        { upsert: true }
      );

      res.json({ success: true, message: 'Pricing updated' });
    } catch (error) {
      console.error('[TUTORIAS] Error updating pricing:', error);
      res.status(500).json({ success: false, error: 'Error updating pricing' });
    }
  });

  // PUT /api/tutorias/admin/cooldowns
  router.put('/admin/cooldowns', async (req, res) => {
    try {
      const { cooldowns } = req.body;
      const db = getDb();
      
      await db.collection('tutorias_config').updateOne(
        { type: 'cooldowns' },
        { 
          $set: { config: cooldowns, updatedAt: new Date() },
          $setOnInsert: { type: 'cooldowns', createdAt: new Date() }
        },
        { upsert: true }
      );

      res.json({ success: true, message: 'Cooldowns updated' });
    } catch (error) {
      console.error('[TUTORIAS] Error updating cooldowns:', error);
      res.status(500).json({ success: false, error: 'Error updating cooldowns' });
    }
  });

  console.log('📚 [TUTORIAS] Routes initialized');
  return router;
}

module.exports = { initTutoriasRoutes };
