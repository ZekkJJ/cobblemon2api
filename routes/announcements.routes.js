/**
 * Announcements Routes
 * Sistema de anuncios/ticker para la web
 */

const express = require('express');
const router = express.Router();

const ADMIN_DISCORD_ID = '478742167557505034';

// In-memory store for active announcement (could be moved to MongoDB if needed)
let activeAnnouncement = null;

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
  const { message, durationMinutes, type, adminDiscordId } = req.body;
  
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
  };
  
  console.log('[ANNOUNCEMENTS] New announcement created:', activeAnnouncement.message);
  
  res.json({ 
    success: true, 
    announcement: activeAnnouncement 
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
