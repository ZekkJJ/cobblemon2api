/**
 * Announcements Routes
 * Sistema de anuncios/ticker para la web + in-game
 */

const express = require('express');
const router = express.Router();

const ADMIN_DISCORD_ID = '478742167557505034';

// In-memory store for active announcement (could be moved to MongoDB if needed)
let activeAnnouncement = null;

// Queue for in-game announcements (plugin polls this)
let inGameAnnouncementQueue = [];

/**
 * GET /api/announcements/active
 * Get the currently active announcement (if any)
 */
router.get('/active', (req, res) => {
  if (!activeAnnouncement) {
    return res.json({ announcement: null });
  }
  
  // Check if announcement has expired
  if (new Date() > new Date(activeAnnouncement.expiresAt)) {
    activeAnnouncement = null;
    return res.json({ announcement: null });
  }
  
  res.json({ announcement: activeAnnouncement });
});

/**
 * POST /api/announcements
 * Create a new announcement (admin only)
 */
router.post('/', (req, res) => {
  const { message, durationMinutes, type, adminDiscordId, sendInGame } = req.body;
  
  // Verify admin
  if (adminDiscordId !== ADMIN_DISCORD_ID) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  
  if (!message || !durationMinutes) {
    return res.status(400).json({ error: 'Mensaje y duración son requeridos' });
  }
  
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
  
  activeAnnouncement = {
    id: Date.now().toString(),
    message,
    type: type || 'info', // info, warning, success, event
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    durationMinutes,
    sendInGame: sendInGame || false,
  };
  
  // If sendInGame is true, add to in-game queue
  if (sendInGame) {
    inGameAnnouncementQueue.push({
      id: activeAnnouncement.id,
      message: message,
      type: type || 'info',
      createdAt: now.toISOString(),
    });
    console.log('[ANNOUNCEMENTS] Added to in-game queue:', message);
  }
  
  console.log('[ANNOUNCEMENTS] New announcement created:', activeAnnouncement.message);
  
  res.json({ 
    success: true, 
    announcement: activeAnnouncement 
  });
});

/**
 * POST /api/announcements/ingame
 * Send announcement ONLY to in-game (not web ticker)
 */
router.post('/ingame', (req, res) => {
  const { message, type, adminDiscordId, title } = req.body;
  
  // Verify admin
  if (adminDiscordId !== ADMIN_DISCORD_ID) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  
  if (!message) {
    return res.status(400).json({ error: 'Mensaje es requerido' });
  }
  
  const announcement = {
    id: Date.now().toString(),
    message,
    title: title || '📢 Anuncio',
    type: type || 'info', // info, warning, success, event
    createdAt: new Date().toISOString(),
  };
  
  inGameAnnouncementQueue.push(announcement);
  console.log('[ANNOUNCEMENTS] In-game announcement queued:', message);
  
  res.json({ 
    success: true, 
    announcement,
    queueSize: inGameAnnouncementQueue.length
  });
});

/**
 * GET /api/announcements/ingame/poll
 * Plugin polls this to get pending in-game announcements
 */
router.get('/ingame/poll', (req, res) => {
  // Return all pending announcements and clear the queue
  const announcements = [...inGameAnnouncementQueue];
  inGameAnnouncementQueue = [];
  
  res.json({ 
    success: true,
    announcements,
    count: announcements.length
  });
});

/**
 * DELETE /api/announcements
 * Remove the active announcement (admin only)
 */
router.delete('/', (req, res) => {
  const { adminDiscordId } = req.body;
  
  if (adminDiscordId !== ADMIN_DISCORD_ID) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  
  activeAnnouncement = null;
  console.log('[ANNOUNCEMENTS] Announcement cleared');
  
  res.json({ success: true });
});

module.exports = router;
