/**
 * Tutorías Routes - Legacy JavaScript Version
 * Endpoints for the tutorías system (pricing, cooldowns, etc.)
 */

const express = require('express');

// Default pricing configuration
const DEFAULT_PRICING = {
  aiTutor: {
    basePrice: 500,
    perQuestionPrice: 100,
    dailyFreeQuestions: 3,
    maxQuestionsPerDay: 20
  },
  battleAnalysis: {
    basePrice: 1000,
    perAnalysisPrice: 250,
    dailyFreeAnalyses: 1,
    maxAnalysesPerDay: 10
  },
  breedAdvisor: {
    basePrice: 750,
    perAdvicePrice: 150,
    dailyFreeAdvices: 2,
    maxAdvicesPerDay: 15
  },
  evPlanner: {
    basePrice: 300,
    perPlanPrice: 50,
    dailyFreePlans: 5,
    maxPlansPerDay: 30
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
  aiTutor: 30,
  battleAnalysis: 60,
  breedAdvisor: 45,
  evPlanner: 15,
  pokebox: 0
};

function initTutoriasRoutes(getDb) {
  const router = express.Router();

  // ============================================
  // PRICING & COOLDOWNS
  // ============================================

  // GET /api/tutorias/pricing
  router.get('/pricing', async (req, res) => {
    try {
      const db = getDb();
      let pricing = await db.collection('tutorias_config').findOne({ type: 'pricing' });
      pricing = pricing?.config || DEFAULT_PRICING;
      res.json({ success: true, pricing });
    } catch (error) {
      console.error('[TUTORIAS] Error getting pricing:', error);
      res.json({ success: true, pricing: DEFAULT_PRICING });
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
      
      if (!question) {
        return res.status(400).json({ success: false, error: 'Pregunta requerida' });
      }

      // Placeholder response - in production would call AI service
      res.json({
        success: true,
        response: {
          answer: `Gracias por tu pregunta sobre: "${question}". El sistema de IA está en desarrollo. Por ahora, te recomiendo consultar la wiki de Cobblemon o preguntar en Discord.`,
          confidence: 0.7,
          sources: ['Cobblemon Wiki', 'Pokémon Database', 'Smogon']
        }
      });
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

      let pcStorage = user.pcStorage || [];
      let party = user.party || [];

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

      // Find duplicates by species
      const speciesCount = {};
      user.pcStorage.forEach(p => {
        const species = p.species || 'Unknown';
        if (!speciesCount[species]) {
          speciesCount[species] = [];
        }
        speciesCount[species].push(p);
      });

      const duplicates = Object.entries(speciesCount)
        .filter(([_, pokemon]) => pokemon.length > 1)
        .map(([species, pokemon]) => ({
          species,
          count: pokemon.length,
          pokemon
        }));

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
