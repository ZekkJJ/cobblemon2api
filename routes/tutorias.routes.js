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
    dailyFreeAccesses: -1, // unlimited
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

  // GET /api/tutorias/pricing - Get pricing configuration
  router.get('/pricing', async (req, res) => {
    try {
      const db = getDb();
      
      // Try to get pricing from database
      let pricing = await db.collection('tutorias_config').findOne({ type: 'pricing' });
      
      if (!pricing) {
        // Return default pricing if not configured
        pricing = { ...DEFAULT_PRICING };
      } else {
        pricing = pricing.config || DEFAULT_PRICING;
      }

      res.json({
        success: true,
        pricing
      });
    } catch (error) {
      console.error('[TUTORIAS] Error getting pricing:', error);
      res.json({
        success: true,
        pricing: DEFAULT_PRICING
      });
    }
  });

  // GET /api/tutorias/cooldowns - Get cooldown configuration
  router.get('/cooldowns', async (req, res) => {
    try {
      const db = getDb();
      
      // Try to get cooldowns from database
      let cooldowns = await db.collection('tutorias_config').findOne({ type: 'cooldowns' });
      
      if (!cooldowns) {
        // Return default cooldowns if not configured
        cooldowns = { ...DEFAULT_COOLDOWNS };
      } else {
        cooldowns = cooldowns.config || DEFAULT_COOLDOWNS;
      }

      res.json({
        success: true,
        cooldowns
      });
    } catch (error) {
      console.error('[TUTORIAS] Error getting cooldowns:', error);
      res.json({
        success: true,
        cooldowns: DEFAULT_COOLDOWNS
      });
    }
  });

  // GET /api/tutorias/user/:discordId/usage - Get user's usage stats
  router.get('/user/:discordId/usage', async (req, res) => {
    try {
      const { discordId } = req.params;
      const db = getDb();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get user's usage for today
      const usage = await db.collection('tutorias_usage').findOne({
        discordId,
        date: { $gte: today }
      });

      if (!usage) {
        res.json({
          success: true,
          usage: {
            aiTutor: { count: 0, lastUsed: null },
            battleAnalysis: { count: 0, lastUsed: null },
            breedAdvisor: { count: 0, lastUsed: null },
            evPlanner: { count: 0, lastUsed: null },
            pokebox: { count: 0, lastUsed: null }
          }
        });
      } else {
        res.json({
          success: true,
          usage: usage.services || {}
        });
      }
    } catch (error) {
      console.error('[TUTORIAS] Error getting user usage:', error);
      res.status(500).json({
        success: false,
        error: 'Error getting usage data'
      });
    }
  });

  // POST /api/tutorias/user/:discordId/use - Record service usage
  router.post('/user/:discordId/use', async (req, res) => {
    try {
      const { discordId } = req.params;
      const { service } = req.body;
      const db = getDb();
      
      if (!service) {
        return res.status(400).json({
          success: false,
          error: 'Service name required'
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Update or create usage record
      await db.collection('tutorias_usage').updateOne(
        { discordId, date: { $gte: today } },
        {
          $inc: { [`services.${service}.count`]: 1 },
          $set: { 
            [`services.${service}.lastUsed`]: new Date(),
            discordId,
            updatedAt: new Date()
          },
          $setOnInsert: {
            date: today,
            createdAt: new Date()
          }
        },
        { upsert: true }
      );

      res.json({
        success: true,
        message: 'Usage recorded'
      });
    } catch (error) {
      console.error('[TUTORIAS] Error recording usage:', error);
      res.status(500).json({
        success: false,
        error: 'Error recording usage'
      });
    }
  });

  // POST /api/tutorias/ai/ask - AI Tutor question
  router.post('/ai/ask', async (req, res) => {
    try {
      const { question, discordId, context } = req.body;
      
      if (!question) {
        return res.status(400).json({
          success: false,
          error: 'Question required'
        });
      }

      // For now, return a placeholder response
      // In production, this would call the AI service
      res.json({
        success: true,
        response: {
          answer: `Esta es una respuesta de prueba para: "${question}". El sistema de IA está en desarrollo.`,
          confidence: 0.8,
          sources: ['Cobblemon Wiki', 'Pokémon Database']
        }
      });
    } catch (error) {
      console.error('[TUTORIAS] Error in AI ask:', error);
      res.status(500).json({
        success: false,
        error: 'Error processing question'
      });
    }
  });

  // POST /api/tutorias/battle/analyze - Battle analysis
  router.post('/battle/analyze', async (req, res) => {
    try {
      const { battleLog, discordId } = req.body;
      
      if (!battleLog) {
        return res.status(400).json({
          success: false,
          error: 'Battle log required'
        });
      }

      // Placeholder response
      res.json({
        success: true,
        analysis: {
          summary: 'Análisis de batalla en desarrollo',
          suggestions: [
            'Considera usar movimientos más efectivos',
            'Mejora la cobertura de tipos de tu equipo'
          ],
          rating: 'B'
        }
      });
    } catch (error) {
      console.error('[TUTORIAS] Error in battle analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Error analyzing battle'
      });
    }
  });

  // POST /api/tutorias/breed/advice - Breeding advice
  router.post('/breed/advice', async (req, res) => {
    try {
      const { pokemon1, pokemon2, targetStats, discordId } = req.body;
      
      // Placeholder response
      res.json({
        success: true,
        advice: {
          compatibility: true,
          eggGroup: 'Field',
          estimatedIVs: {
            hp: '20-31',
            attack: '25-31',
            defense: '15-31',
            spAtk: '10-31',
            spDef: '20-31',
            speed: '25-31'
          },
          suggestions: [
            'Usa un Ditto con IVs altos para mejores resultados',
            'Considera usar objetos de poder para pasar IVs específicos'
          ]
        }
      });
    } catch (error) {
      console.error('[TUTORIAS] Error in breed advice:', error);
      res.status(500).json({
        success: false,
        error: 'Error getting breeding advice'
      });
    }
  });

  // POST /api/tutorias/ev/plan - EV training plan
  router.post('/ev/plan', async (req, res) => {
    try {
      const { pokemon, targetSpread, discordId } = req.body;
      
      // Placeholder response
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
      res.status(500).json({
        success: false,
        error: 'Error creating EV plan'
      });
    }
  });

  // GET /api/tutorias/pokebox/:discordId - Get user's pokebox
  router.get('/pokebox/:discordId', async (req, res) => {
    try {
      const { discordId } = req.params;
      const db = getDb();
      
      // Get user by discord ID
      const user = await db.collection('users').findOne({ discordId });
      
      if (!user) {
        return res.json({
          success: true,
          pokebox: [],
          party: []
        });
      }

      res.json({
        success: true,
        pokebox: user.pcStorage || [],
        party: user.party || []
      });
    } catch (error) {
      console.error('[TUTORIAS] Error getting pokebox:', error);
      res.status(500).json({
        success: false,
        error: 'Error getting pokebox'
      });
    }
  });

  // Admin endpoints
  // PUT /api/tutorias/admin/pricing - Update pricing (admin only)
  router.put('/admin/pricing', async (req, res) => {
    try {
      const { pricing } = req.body;
      const db = getDb();
      
      await db.collection('tutorias_config').updateOne(
        { type: 'pricing' },
        { 
          $set: { 
            config: pricing,
            updatedAt: new Date()
          },
          $setOnInsert: {
            type: 'pricing',
            createdAt: new Date()
          }
        },
        { upsert: true }
      );

      res.json({
        success: true,
        message: 'Pricing updated'
      });
    } catch (error) {
      console.error('[TUTORIAS] Error updating pricing:', error);
      res.status(500).json({
        success: false,
        error: 'Error updating pricing'
      });
    }
  });

  // PUT /api/tutorias/admin/cooldowns - Update cooldowns (admin only)
  router.put('/admin/cooldowns', async (req, res) => {
    try {
      const { cooldowns } = req.body;
      const db = getDb();
      
      await db.collection('tutorias_config').updateOne(
        { type: 'cooldowns' },
        { 
          $set: { 
            config: cooldowns,
            updatedAt: new Date()
          },
          $setOnInsert: {
            type: 'cooldowns',
            createdAt: new Date()
          }
        },
        { upsert: true }
      );

      res.json({
        success: true,
        message: 'Cooldowns updated'
      });
    } catch (error) {
      console.error('[TUTORIAS] Error updating cooldowns:', error);
      res.status(500).json({
        success: false,
        error: 'Error updating cooldowns'
      });
    }
  });

  console.log('📚 [TUTORIAS] Routes initialized');
  return router;
}

module.exports = { initTutoriasRoutes };
