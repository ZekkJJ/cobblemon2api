/**
 * Servicio de Administración - Cobblemon Los Pitufos Backend API
 */

import { Collection } from 'mongodb';
import { User } from '../../shared/types/user.types.js';
import { AppError, Errors } from '../../shared/middleware/error-handler.js';

export class AdminService {
  constructor(private usersCollection: Collection<User>) {}

  async banPlayer(uuid: string, banReason: string, adminName: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.usersCollection.findOne({ minecraftUuid: uuid });

      if (!user) {
        throw Errors.playerNotFound();
      }

      await this.usersCollection.updateOne(
        { minecraftUuid: uuid },
        {
          $set: {
            banned: true,
            banReason,
            bannedAt: new Date().toISOString(),
            bannedBy: adminName,
            updatedAt: new Date(),
          },
        }
      );

      return {
        success: true,
        message: `Jugador ${user.minecraftUsername} baneado exitosamente`,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[ADMIN SERVICE] Error baneando jugador:', error);
      throw Errors.databaseError();
    }
  }

  async unbanPlayer(uuid: string, adminName: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.usersCollection.findOne({ minecraftUuid: uuid });

      if (!user) {
        throw Errors.playerNotFound();
      }

      await this.usersCollection.updateOne(
        { minecraftUuid: uuid },
        {
          $set: {
            banned: false,
            unbannedAt: new Date().toISOString(),
            unbannedBy: adminName,
            updatedAt: new Date(),
          },
          $unset: {
            banReason: '',
            bannedAt: '',
            bannedBy: '',
          },
        }
      );

      return {
        success: true,
        message: `Jugador ${user.minecraftUsername} desbaneado exitosamente`,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[ADMIN SERVICE] Error desbaneando jugador:', error);
      throw Errors.databaseError();
    }
  }

  async resetDatabase(adminName: string): Promise<{ success: boolean; message: string }> {
    try {
      console.warn(`[ADMIN SERVICE] ⚠️  RESET DE BASE DE DATOS INICIADO POR ${adminName}`);
      
      // Resetear colecciones principales
      await this.usersCollection.deleteMany({});
      console.log('[ADMIN SERVICE] ✅ Colección de usuarios limpiada');
      
      // Nota: No reseteamos starters collection porque queremos mantener el registro
      // de qué starters fueron reclamados para estadísticas
      
      console.log(`[ADMIN SERVICE] ✅ Reset completado por ${adminName}`);
      
      return {
        success: true,
        message: 'Base de datos reseteada exitosamente. Todos los usuarios han sido eliminados.',
      };
    } catch (error) {
      console.error('[ADMIN SERVICE] Error reseteando base de datos:', error);
      throw Errors.databaseError();
    }
  }

  async getBanStatus(uuid: string): Promise<{ banned: boolean; banReason?: string }> {
    try {
      const user = await this.usersCollection.findOne({ minecraftUuid: uuid });

      if (!user) {
        // Si el usuario no existe, no está baneado
        return { banned: false };
      }

      return {
        banned: user.banned || false,
        banReason: user.banReason,
      };
    } catch (error) {
      console.error('[ADMIN SERVICE] Error obteniendo estado de ban:', error);
      throw Errors.databaseError();
    }
  }
}
