/**
 * Servicio WebSocket para Torneos
 * Cobblemon Los Pitufos - Backend API
 * 
 * Maneja comunicación en tiempo real para actualizaciones de brackets.
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { 
  Tournament, 
  TournamentMatch, 
  TournamentParticipant 
} from '../../shared/types/tournament.types.js';

// ============================================
// TIPOS DE MENSAJES
// ============================================

export type TournamentUpdateType = 
  | 'PARTICIPANT_JOINED'
  | 'PARTICIPANT_LEFT'
  | 'MATCH_STARTED'
  | 'MATCH_COMPLETED'
  | 'ROUND_COMPLETED'
  | 'TOURNAMENT_STARTED'
  | 'TOURNAMENT_COMPLETED'
  | 'TOURNAMENT_CANCELLED'
  | 'BRACKET_UPDATED';

export interface TournamentUpdate {
  type: TournamentUpdateType;
  tournamentId: string;
  timestamp: number;
  data: any;
}

export interface WSClientMessage {
  type: 'SUBSCRIBE' | 'UNSUBSCRIBE' | 'PING';
  tournamentId?: string;
}

export interface WSServerMessage {
  type: 'TOURNAMENT_UPDATE' | 'MATCH_UPDATE' | 'NOTIFICATION' | 'PONG' | 'ERROR' | 'SUBSCRIBED' | 'UNSUBSCRIBED';
  payload: any;
  timestamp: number;
}

export interface PlayerNotification {
  playerUuid: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  data?: any;
}

// ============================================
// SERVICIO WEBSOCKET
// ============================================

export class WebSocketService {
  private io: Server | null = null;
  private tournamentRooms: Map<string, Set<string>> = new Map();
  private playerSockets: Map<string, string> = new Map(); // playerUuid -> socketId

  /**
   * Inicializa el servidor WebSocket
   */
  initialize(httpServer: HttpServer, corsOrigins: string[]): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: corsOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/ws',
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupEventHandlers();
    console.log('[WEBSOCKET] Servidor WebSocket inicializado');
  }

  /**
   * Configura los manejadores de eventos
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      console.log(`[WEBSOCKET] Cliente conectado: ${socket.id}`);

      // Manejar suscripción a torneo
      socket.on('subscribe', (data: { tournamentId: string; playerUuid?: string }) => {
        this.handleSubscribe(socket, data.tournamentId, data.playerUuid);
      });

      // Manejar desuscripción
      socket.on('unsubscribe', (data: { tournamentId: string }) => {
        this.handleUnsubscribe(socket, data.tournamentId);
      });

      // Manejar ping
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // Manejar desconexión
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * Maneja la suscripción a un torneo
   */
  private handleSubscribe(socket: Socket, tournamentId: string, playerUuid?: string): void {
    const room = `tournament:${tournamentId}`;
    socket.join(room);

    // Registrar en el mapa de rooms
    if (!this.tournamentRooms.has(tournamentId)) {
      this.tournamentRooms.set(tournamentId, new Set());
    }
    this.tournamentRooms.get(tournamentId)!.add(socket.id);

    // Registrar jugador si se proporciona UUID
    if (playerUuid) {
      this.playerSockets.set(playerUuid, socket.id);
    }

    socket.emit('subscribed', { 
      tournamentId, 
      timestamp: Date.now(),
      message: 'Suscrito a actualizaciones del torneo'
    });

    console.log(`[WEBSOCKET] ${socket.id} suscrito a torneo ${tournamentId}`);
  }

  /**
   * Maneja la desuscripción de un torneo
   */
  private handleUnsubscribe(socket: Socket, tournamentId: string): void {
    const room = `tournament:${tournamentId}`;
    socket.leave(room);

    // Remover del mapa de rooms
    const roomSockets = this.tournamentRooms.get(tournamentId);
    if (roomSockets) {
      roomSockets.delete(socket.id);
      if (roomSockets.size === 0) {
        this.tournamentRooms.delete(tournamentId);
      }
    }

    socket.emit('unsubscribed', { 
      tournamentId, 
      timestamp: Date.now() 
    });

    console.log(`[WEBSOCKET] ${socket.id} desuscrito de torneo ${tournamentId}`);
  }

  /**
   * Maneja la desconexión de un cliente
   */
  private handleDisconnect(socket: Socket): void {
    // Limpiar de todos los rooms
    for (const [tournamentId, sockets] of this.tournamentRooms.entries()) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        this.tournamentRooms.delete(tournamentId);
      }
    }

    // Limpiar del mapa de jugadores
    for (const [playerUuid, socketId] of this.playerSockets.entries()) {
      if (socketId === socket.id) {
        this.playerSockets.delete(playerUuid);
        break;
      }
    }

    console.log(`[WEBSOCKET] Cliente desconectado: ${socket.id}`);
  }


  // ============================================
  // MÉTODOS DE BROADCAST
  // ============================================

  /**
   * Envía una actualización de torneo a todos los suscriptores
   */
  broadcastTournamentUpdate(tournamentId: string, update: TournamentUpdate): void {
    if (!this.io) {
      console.warn('[WEBSOCKET] Servidor no inicializado');
      return;
    }

    const room = `tournament:${tournamentId}`;
    const message: WSServerMessage = {
      type: 'TOURNAMENT_UPDATE',
      payload: update,
      timestamp: Date.now(),
    };

    this.io.to(room).emit('tournament_update', message);
    console.log(`[WEBSOCKET] Broadcast a ${room}: ${update.type}`);
  }

  /**
   * Envía una actualización de match
   */
  broadcastMatchUpdate(tournamentId: string, match: TournamentMatch): void {
    if (!this.io) return;

    const room = `tournament:${tournamentId}`;
    const message: WSServerMessage = {
      type: 'MATCH_UPDATE',
      payload: {
        match,
        tournamentId,
      },
      timestamp: Date.now(),
    };

    this.io.to(room).emit('match_update', message);
    console.log(`[WEBSOCKET] Match update en ${room}: ${match.id}`);
  }

  /**
   * Notifica cuando un participante se une
   */
  broadcastParticipantJoined(tournamentId: string, participant: TournamentParticipant): void {
    this.broadcastTournamentUpdate(tournamentId, {
      type: 'PARTICIPANT_JOINED',
      tournamentId,
      timestamp: Date.now(),
      data: { participant },
    });
  }

  /**
   * Notifica cuando un participante se va
   */
  broadcastParticipantLeft(tournamentId: string, participantId: string): void {
    this.broadcastTournamentUpdate(tournamentId, {
      type: 'PARTICIPANT_LEFT',
      tournamentId,
      timestamp: Date.now(),
      data: { participantId },
    });
  }

  /**
   * Notifica cuando un match comienza
   */
  broadcastMatchStarted(tournamentId: string, match: TournamentMatch): void {
    this.broadcastTournamentUpdate(tournamentId, {
      type: 'MATCH_STARTED',
      tournamentId,
      timestamp: Date.now(),
      data: { match },
    });
  }

  /**
   * Notifica cuando un match termina
   */
  broadcastMatchCompleted(
    tournamentId: string, 
    match: TournamentMatch, 
    nextMatch?: TournamentMatch
  ): void {
    this.broadcastTournamentUpdate(tournamentId, {
      type: 'MATCH_COMPLETED',
      tournamentId,
      timestamp: Date.now(),
      data: { match, nextMatch },
    });
  }

  /**
   * Notifica cuando una ronda termina
   */
  broadcastRoundCompleted(tournamentId: string, roundNumber: number): void {
    this.broadcastTournamentUpdate(tournamentId, {
      type: 'ROUND_COMPLETED',
      tournamentId,
      timestamp: Date.now(),
      data: { roundNumber },
    });
  }

  /**
   * Notifica cuando el torneo comienza
   */
  broadcastTournamentStarted(tournament: Tournament): void {
    this.broadcastTournamentUpdate(tournament._id!.toString(), {
      type: 'TOURNAMENT_STARTED',
      tournamentId: tournament._id!.toString(),
      timestamp: Date.now(),
      data: { tournament },
    });
  }

  /**
   * Notifica cuando el torneo termina
   */
  broadcastTournamentCompleted(tournament: Tournament): void {
    this.broadcastTournamentUpdate(tournament._id!.toString(), {
      type: 'TOURNAMENT_COMPLETED',
      tournamentId: tournament._id!.toString(),
      timestamp: Date.now(),
      data: { 
        tournament,
        winnerId: tournament.winnerId,
        winnerUsername: tournament.winnerUsername,
      },
    });
  }

  /**
   * Notifica cuando el torneo se cancela
   */
  broadcastTournamentCancelled(tournamentId: string): void {
    this.broadcastTournamentUpdate(tournamentId, {
      type: 'TOURNAMENT_CANCELLED',
      tournamentId,
      timestamp: Date.now(),
      data: {},
    });
  }

  /**
   * Envía una notificación a un jugador específico
   */
  notifyParticipant(playerUuid: string, notification: PlayerNotification): void {
    if (!this.io) return;

    const socketId = this.playerSockets.get(playerUuid);
    if (socketId) {
      const message: WSServerMessage = {
        type: 'NOTIFICATION',
        payload: notification,
        timestamp: Date.now(),
      };

      this.io.to(socketId).emit('notification', message);
      console.log(`[WEBSOCKET] Notificación enviada a ${playerUuid}`);
    }
  }

  // ============================================
  // MÉTODOS DE UTILIDAD
  // ============================================

  /**
   * Obtiene el número de clientes conectados a un torneo
   */
  getConnectedClients(tournamentId: string): number {
    return this.tournamentRooms.get(tournamentId)?.size || 0;
  }

  /**
   * Obtiene todos los torneos con clientes conectados
   */
  getActiveRooms(): { tournamentId: string; clients: number }[] {
    const rooms: { tournamentId: string; clients: number }[] = [];
    for (const [tournamentId, sockets] of this.tournamentRooms.entries()) {
      rooms.push({ tournamentId, clients: sockets.size });
    }
    return rooms;
  }

  /**
   * Verifica si un jugador está conectado
   */
  isPlayerConnected(playerUuid: string): boolean {
    return this.playerSockets.has(playerUuid);
  }

  /**
   * Cierra el servidor WebSocket
   */
  close(): void {
    if (this.io) {
      this.io.close();
      this.io = null;
      this.tournamentRooms.clear();
      this.playerSockets.clear();
      console.log('[WEBSOCKET] Servidor cerrado');
    }
  }
}

// Instancia singleton
let wsServiceInstance: WebSocketService | null = null;

export function getWebSocketService(): WebSocketService {
  if (!wsServiceInstance) {
    wsServiceInstance = new WebSocketService();
  }
  return wsServiceInstance;
}

export function initializeWebSocket(httpServer: HttpServer, corsOrigins: string[]): WebSocketService {
  const service = getWebSocketService();
  service.initialize(httpServer, corsOrigins);
  return service;
}
