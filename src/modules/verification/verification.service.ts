/**
 * Servicio de Verificación
 * Cobblemon Los Pitufos - Backend API
 * 
 * Maneja la lógica de negocio del sistema de verificación Minecraft-Discord
 */

import { Collection } from 'mongodb';
import { User } from '../../shared/types/user.types.js';
import { AppError, Errors } from '../../shared/middleware/error-handler.js';
import { randomBytes } from 'crypto';

/**
 * Resultado de generación de código
 */
export interface GenerateCodeResult {
  success: boolean;
  code: string;
}

/**
 * Resultado de verificación
 */
export interface VerificationResult {
  success: boolean;
  message: string;
  minecraftUsername?: string;
}

export class VerificationService {
  // Códigos activos con timestamp de expiración (15 minutos)
  private activeCodes: Map<string, { uuid: string; expiresAt: number }> = new Map();
  
  constructor(private usersCollection: Collection<User>) {
    // Limpiar códigos expirados cada 5 minutos
    setInterval(() => this.cleanupExpiredCodes(), 5 * 60 * 1000);
  }

  /**
   * Genera un código de verificación seguro de 8 caracteres alfanuméricos
   * Usa crypto.randomBytes en lugar de Math.random() para mayor seguridad
   */
  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin caracteres ambiguos (0, O, 1, I)
    const codeLength = 8;
    const bytes = randomBytes(codeLength);
    
    let code = '';
    for (let i = 0; i < codeLength; i++) {
      code += chars[bytes[i] % chars.length];
    }
    
    return code;
  }

  /**
   * Limpia códigos expirados del mapa en memoria
   */
  private cleanupExpiredCodes(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [code, data] of this.activeCodes.entries()) {
      if (data.expiresAt < now) {
        this.activeCodes.delete(code);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[VERIFICATION SERVICE] Limpiados ${cleaned} códigos expirados`);
    }
  }

  /**
   * Genera un código de verificación para un jugador de Minecraft
   * Llamado desde el plugin cuando el jugador usa /verify
   */
  async generateVerificationCode(
    minecraftUuid: string,
    minecraftUsername: string
  ): Promise<GenerateCodeResult> {
    try {
      // Generar código seguro de 8 caracteres
      const code = this.generateCode();
      const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutos

      console.log('[VERIFICATION SERVICE] Generando código para:', { minecraftUuid, minecraftUsername, code });

      // Guardar código en memoria con expiración
      this.activeCodes.set(code, { uuid: minecraftUuid, expiresAt });

      // Buscar usuario existente
      const existing = await this.usersCollection.findOne({ minecraftUuid });

      if (existing) {
        // Actualizar usuario existente con nuevo código
        await this.usersCollection.updateOne(
          { minecraftUuid },
          {
            $set: {
              minecraftUsername,
              verificationCode: code,
              verificationCodeExpiresAt: new Date(expiresAt).toISOString(),
              verified: false,
              updatedAt: new Date(),
            },
          }
        );
        console.log('[VERIFICATION SERVICE] Código actualizado para usuario existente');
      } else {
        // Crear nuevo usuario
        const newUser: Partial<User> = {
          discordId: null,
          discordUsername: '',
          nickname: minecraftUsername,
          minecraftUuid,
          minecraftUsername,
          verificationCode: code,
          verificationCodeExpiresAt: new Date(expiresAt).toISOString(),
          verified: false,
          starterId: null,
          starterIsShiny: false,
          starterGiven: false,
          rolledAt: null,
          isAdmin: false,
          banned: false,
          pokemonParty: [],
          pcStorage: [],
          cobbleDollarsBalance: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await this.usersCollection.insertOne(newUser as User);
        console.log('[VERIFICATION SERVICE] Nuevo usuario creado con código');
      }

      return {
        success: true,
        code,
      };
    } catch (error) {
      console.error('[VERIFICATION SERVICE] Error generando código:', error);
      throw Errors.databaseError();
    }
  }

  /**
   * Verifica un código desde el plugin de Minecraft
   * Llamado cuando el jugador usa /verify <code> en el juego
   */
  async verifyCodeFromPlugin(minecraftUuid: string, code: string): Promise<VerificationResult> {
    try {
      console.log('[VERIFICATION SERVICE] Verificando código desde plugin:', { minecraftUuid, code });

      // Verificar si el código está en memoria y no ha expirado
      const codeData = this.activeCodes.get(code);
      if (!codeData || codeData.expiresAt < Date.now()) {
        console.log('[VERIFICATION SERVICE] Código expirado o no encontrado en memoria');
        return {
          success: false,
          message: 'Código de verificación expirado o inválido',
        };
      }

      // Buscar usuario con UUID y código coincidentes
      const user = await this.usersCollection.findOne({
        minecraftUuid,
        verificationCode: code,
      });

      if (!user) {
        console.log('[VERIFICATION SERVICE] Código inválido o UUID no coincide');
        return {
          success: false,
          message: 'Código de verificación inválido',
        };
      }

      // Verificar expiración en base de datos también
      if (user.verificationCodeExpiresAt && new Date(user.verificationCodeExpiresAt) < new Date()) {
        console.log('[VERIFICATION SERVICE] Código expirado en base de datos');
        return {
          success: false,
          message: 'Código de verificación expirado',
        };
      }

      // Marcar como verificado
      await this.usersCollection.updateOne(
        { minecraftUuid },
        {
          $set: {
            verified: true,
            verifiedAt: new Date().toISOString(),
            lastVerificationCode: code,
            updatedAt: new Date(),
          },
          $unset: {
            verificationCode: '',
            verificationCodeExpiresAt: '',
          },
        }
      );

      // Remover código de memoria
      this.activeCodes.delete(code);

      console.log('[VERIFICATION SERVICE] Verificación exitosa para:', user.minecraftUsername);

      return {
        success: true,
        message: 'Verificación exitosa',
        minecraftUsername: user.minecraftUsername,
      };
    } catch (error) {
      console.error('[VERIFICATION SERVICE] Error verificando código:', error);
      throw Errors.databaseError();
    }
  }

  /**
   * Verifica un código desde la web y vincula con Discord
   * Llamado cuando el usuario ingresa el código en la página web
   */
  async verifyCodeFromWeb(
    code: string,
    discordId: string,
    discordUsername: string
  ): Promise<VerificationResult> {
    try {
      console.log('[VERIFICATION SERVICE] Verificando código desde web:', { code, discordId });

      // Verificar si el código está en memoria y no ha expirado
      const codeData = this.activeCodes.get(code);
      if (!codeData || codeData.expiresAt < Date.now()) {
        throw Errors.invalidCode();
      }

      // Buscar usuario de Minecraft con este código
      const minecraftUser = await this.usersCollection.findOne({ verificationCode: code });

      if (!minecraftUser) {
        throw Errors.invalidCode();
      }

      // Verificar expiración en base de datos también
      if (minecraftUser.verificationCodeExpiresAt && new Date(minecraftUser.verificationCodeExpiresAt) < new Date()) {
        throw Errors.invalidCode();
      }

      // Verificar si este Discord ID ya tiene un usuario (de gacha/login previo)
      const existingDiscordUser = await this.usersCollection.findOne({
        discordId,
        minecraftUuid: { $ne: minecraftUser.minecraftUuid },
      });

      if (existingDiscordUser) {
        // MERGE: Usuario de Discord ya existe con posible starter
        // Actualizar el registro de Minecraft con datos de Discord + merge starter
        await this.usersCollection.updateOne(
          { minecraftUuid: minecraftUser.minecraftUuid },
          {
            $set: {
              discordId,
              discordUsername: discordUsername || existingDiscordUser.discordUsername || '',
              nickname: existingDiscordUser.nickname || minecraftUser.nickname || '',
              starterId: existingDiscordUser.starterId || null,
              starterIsShiny: existingDiscordUser.starterIsShiny || false,
              starterGiven: existingDiscordUser.starterGiven || false,
              rolledAt: existingDiscordUser.rolledAt || null,
              isAdmin: existingDiscordUser.isAdmin || false,
              verified: true,
              verifiedAt: new Date().toISOString(),
              lastVerificationCode: code,
              updatedAt: new Date(),
            },
            $unset: {
              verificationCode: '',
              verificationCodeExpiresAt: '',
            },
          }
        );

        // Eliminar el usuario solo-Discord para prevenir duplicados
        await this.usersCollection.deleteOne({
          discordId,
          minecraftUuid: { $exists: false },
        });

        console.log(
          `[VERIFICATION SERVICE] Merged Discord user ${discordId} into Minecraft user ${minecraftUser.minecraftUuid}`
        );
      } else {
        // No hay usuario de Discord existente - vinculación simple
        await this.usersCollection.updateOne(
          { minecraftUuid: minecraftUser.minecraftUuid },
          {
            $set: {
              discordId,
              discordUsername: discordUsername || '',
              verified: true,
              verifiedAt: new Date().toISOString(),
              lastVerificationCode: code,
              updatedAt: new Date(),
            },
            $unset: {
              verificationCode: '',
              verificationCodeExpiresAt: '',
            },
          }
        );

        console.log(`[VERIFICATION SERVICE] Linked Discord ${discordId} to Minecraft ${minecraftUser.minecraftUuid}`);
      }

      // Remover código de memoria
      this.activeCodes.delete(code);

      return {
        success: true,
        message: '¡Verificación exitosa! Ya puedes moverte en el servidor.',
        minecraftUsername: minecraftUser.minecraftUsername,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('[VERIFICATION SERVICE] Error verificando código desde web:', error);
      throw Errors.databaseError();
    }
  }

  /**
   * Verifica el estado de un código de verificación
   * Usado para polling desde el plugin
   */
  async checkCodeStatus(code: string): Promise<{
    verified: boolean;
    discordLinked: boolean;
    error?: string;
  }> {
    try {
      // Buscar usuario con este código O que tuvo este código antes (para usuarios verificados)
      const user = await this.usersCollection.findOne({
        $or: [{ verificationCode: code }, { verified: true, lastVerificationCode: code }],
      });

      if (!user) {
        return {
          verified: false,
          discordLinked: false,
          error: 'Código no encontrado',
        };
      }

      return {
        verified: user.verified === true,
        discordLinked: !!user.discordId,
      };
    } catch (error) {
      console.error('[VERIFICATION SERVICE] Error verificando estado de código:', error);
      throw Errors.databaseError();
    }
  }
}
