/**
 * Bulk Items Routes
 * Sistema para enviar múltiples items a jugadores via el plugin
 * El plugin hace polling y ejecuta /give para cada item
 */

const express = require('express');
const router = express.Router();

// Cola de entregas pendientes (en memoria, el plugin hace polling)
let pendingItemDeliveries = [];

/**
 * POST /api/admin/bulk-items/send
 * Crear una nueva entrega de items para un jugador
 */
router.post('/send', async (req, res) => {
  try {
    const { playerUuid, playerName, items } = req.body;
    
    if (!playerUuid || !playerName) {
      return res.status(400).json({ error: 'playerUuid y playerName son requeridos' });
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items debe ser un array con al menos un item' });
    }

    const delivery = {
      _id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
      playerUuid,
      playerName,
      items: items.map(item => ({
        itemId: item.itemId,
        displayName: item.displayName || item.itemId,
        quantity: item.quantity || 1,
        nbt: item.nbt || null,
      })),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    pendingItemDeliveries.push(delivery);
    console.log(`[BULK-ITEMS] Created delivery ${delivery._id} for ${playerName}: ${items.length} items`);

    res.json({ success: true, deliveryId: delivery._id, message: 'Entrega creada' });
  } catch (error) {
    console.error('[BULK-ITEMS] Error creating delivery:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/bulk-items/pending
 * Obtener todas las entregas pendientes (para el panel admin)
 */
router.get('/pending', async (req, res) => {
  try {
    res.json({ 
      success: true, 
      deliveries: pendingItemDeliveries,
      count: pendingItemDeliveries.length 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/bulk-items/poll/:uuid
 * Plugin polls this to get pending items for a specific player
 */
router.get('/poll/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    
    // Find pending deliveries for this player
    const playerDeliveries = pendingItemDeliveries.filter(
      d => d.playerUuid === uuid && d.status === 'pending'
    );
    
    if (playerDeliveries.length === 0) {
      return res.json({ success: true, deliveries: [], count: 0 });
    }

    res.json({ 
      success: true, 
      deliveries: playerDeliveries,
      count: playerDeliveries.length 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/bulk-items/poll-all
 * Plugin polls this to get ALL pending deliveries
 */
router.get('/poll-all', async (req, res) => {
  try {
    const pending = pendingItemDeliveries.filter(d => d.status === 'pending');
    res.json({ 
      success: true, 
      deliveries: pending,
      count: pending.length 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/bulk-items/confirm/:deliveryId
 * Plugin confirms delivery was successful
 */
router.post('/confirm/:deliveryId', async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { success, itemsDelivered } = req.body;
    
    const index = pendingItemDeliveries.findIndex(d => d._id === deliveryId);
    if (index === -1) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    pendingItemDeliveries[index].status = success ? 'delivered' : 'failed';
    pendingItemDeliveries[index].deliveredAt = new Date().toISOString();
    pendingItemDeliveries[index].itemsDelivered = itemsDelivered || 0;
    
    console.log(`[BULK-ITEMS] Delivery ${deliveryId} ${success ? 'completed' : 'failed'}`);
    
    // Clean up old delivered items after 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    pendingItemDeliveries = pendingItemDeliveries.filter(d => {
      if (d.status === 'pending') return true;
      const deliveredTime = new Date(d.deliveredAt || d.createdAt).getTime();
      return deliveredTime > oneHourAgo;
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/bulk-items/:deliveryId
 * Cancel a pending delivery
 */
router.delete('/:deliveryId', async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const index = pendingItemDeliveries.findIndex(d => d._id === deliveryId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    pendingItemDeliveries.splice(index, 1);
    console.log(`[BULK-ITEMS] Delivery ${deliveryId} cancelled`);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;