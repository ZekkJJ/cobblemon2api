import { Router } from 'express';
import { TutoriasController } from './tutorias.controller.js';
import { requireAuth as authMiddleware, requireAdmin as adminMiddleware } from '../auth/auth.middleware.js';

const router = Router();
const controller = new TutoriasController();

// ============================================================================
// Battle Analysis Routes
// ============================================================================
router.post('/battle-analysis/request', authMiddleware, controller.requestBattleAnalysis);
router.get('/battle-analysis/history', authMiddleware, controller.getBattleHistory);
router.get('/battle-analysis/:battleId', authMiddleware, controller.getBattleAnalysis);

// ============================================================================
// AI Tutor Routes
// ============================================================================
router.post('/ai-tutor/ask', authMiddleware, controller.askAITutor);
router.get('/ai-tutor/history', authMiddleware, controller.getAITutorHistory);

// ============================================================================
// Breed Advisor Routes
// ============================================================================
router.post('/breed-advisor/ask', authMiddleware, controller.askBreedAdvisor);

// ============================================================================
// PokéBox Routes
// ============================================================================
router.get('/pokebox', authMiddleware, controller.getPokeBox);
router.post('/pokebox/protect', authMiddleware, controller.updateProtection);
router.get('/pokebox/duplicates', authMiddleware, controller.getDuplicates);

// ============================================================================
// Stat Planner Routes
// ============================================================================
router.post('/stat-planner/save', authMiddleware, controller.saveEVPlan);
router.get('/stat-planner/:pokemonUuid', authMiddleware, controller.getEVPlan);

// ============================================================================
// Pricing & Cooldown Routes
// ============================================================================
router.get('/pricing', controller.getPricing);
router.put('/pricing', authMiddleware, adminMiddleware, controller.updatePricing);
router.get('/cooldowns', authMiddleware, controller.getCooldowns);

// ============================================================================
// Plugin Integration Routes (Internal)
// ============================================================================
router.post('/plugin/battle-log', controller.storeBattleLog);
router.get('/plugin/pending-sync/:minecraftUuid', controller.getPendingSyncs);
router.post('/plugin/confirm-sync', controller.confirmSync);

// ============================================================================
// Admin Routes
// ============================================================================
router.get('/admin/suspicious-activity', authMiddleware, adminMiddleware, controller.getSuspiciousActivity);
router.post('/admin/suspicious-activity/:id/resolve', authMiddleware, adminMiddleware, controller.resolveSuspiciousActivity);
router.get('/admin/balance-ledger/:userId', authMiddleware, adminMiddleware, controller.getBalanceLedger);
router.get('/admin/abuse-stats', authMiddleware, adminMiddleware, controller.getAbuseStats);

export default router;
