/**
 * Servicio de Autenticación
 * Cobblemon Los Pitufos - Backend API
 * 
 * Maneja la lógica de negocio de autenticación con Discord OAuth
 */

import { Collection } from 'mongodb';
import { User, CreateUserData, createDefaultUser } from '../../shared/types/user.types.js';
import { 
  exchangeCodeForTokens, 
  getDiscordUser, 
  generateJWT, 
  getDiscordAvatarUrl 
} from '../../config/auth.js';
import { AppError, Errors } from '../../shared/middleware/error-handler.js';

export class AuthService {
  constructor(private usersCollection: Collection<User>) {}

  /**
   * Procesa el callback de Discord OAuth y crea/actualiza el usuario
   */
  async handleDiscordCallback(code: string): Promise<{ user: User; token: string }> {
    try {
      // Intercambiar código por tokens
      console.log('Intercambiando código por tokens...');
      const tokens = await exchangeCodeForTokens(code);
      console.log('Tokens obtenidos exitosamente');
      
      // Obtener información del usuario de Discord
      console.log('Obteniendo información del usuario de Discord...');
      const discordUser = await getDiscordUser(tokens.access_token);
      console.log('Usuario de Discord obtenido:', discordUser.username);
      
      // Crear datos del usuario
      const userData: CreateUserData = {
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        discordAvatar: getDiscordAvatarUrl(discordUser.id, discordUser.avatar),
        nickname: discordUser.global_name || discordUser.username,
      };

      // Buscar o crear usuario
      console.log('Buscando o creando usuario en la base de datos...');
      const user = await this.findOrCreateUser(userData);
      console.log('Usuario procesado exitosamente:', user.discordUsername);

      // Generar JWT
      const token = generateJWT({
        discordId: user.discordId!,
        discordUsername: user.discordUsername,
        discordAvatar: user.discordAvatar,
        isAdmin: user.isAdmin,
      });

      return { user, token };
    } catch (error: any) {
      console.error('Error en handleDiscordCallback:', error);
      if (error instanceof AppError) {
        throw error;
      }
      // Proporcionar más detalles del error
      throw new AppError(
        `Error en Discord OAuth: ${error.message || 'Error desconocido'}`,
        500,
        'EXTERNAL_SERVICE_ERROR' as any
      );
    }
  }

  /**
   * Busca un usuario por Discord ID o lo crea si no existe
   */
  async findOrCreateUser(data: CreateUserData): Promise<User> {
    // Buscar usuario existente
    const existingUser = await this.usersCollection.findOne({
      discordId: data.discordId,
    });

    if (existingUser) {
      // Actualizar información de Discord (puede haber cambiado)
      const updateData: Partial<User> = {
        discordUsername: data.discordUsername,
        discordAvatar: data.discordAvatar,
        nickname: data.nickname || existingUser.nickname,
        updatedAt: new Date(),
      };

      await this.usersCollection.updateOne(
        { discordId: data.discordId },
        { $set: updateData }
      );

      return {
        ...existingUser,
        ...updateData,
      };
    }

    // Crear nuevo usuario
    const newUser = createDefaultUser(data);
    const result = await this.usersCollection.insertOne(newUser as User);

    return {
      ...newUser,
      _id: result.insertedId,
    } as User;
  }

  /**
   * Obtiene un usuario por Discord ID
   */
  async getUserByDiscordId(discordId: string): Promise<User> {
    const user = await this.usersCollection.findOne({ discordId });
    
    if (!user) {
      throw Errors.userNotFound();
    }

    return user;
  }

  /**
   * Verifica si un usuario está baneado
   */
  async checkUserBan(discordId: string): Promise<void> {
    const user = await this.getUserByDiscordId(discordId);
    
    if (user.banned) {
      throw new AppError(
        `Tu cuenta está baneada. Razón: ${user.banReason || 'No especificada'}`,
        403,
        'USER_BANNED' as any
      );
    }
  }

  /**
   * Verifica/registra un usuario por nombre de Discord (sin OAuth)
   * Usado para autenticación alternativa sin Discord OAuth
   */
  async verifyUsernameAuth(
    discordUsername: string,
    nickname?: string
  ): Promise<{ user: User; token: string }> {
    // Generar un Discord ID único basado en el username
    // En producción, esto debería validarse contra el servidor de Discord
    const discordId = `username_${Buffer.from(discordUsername.toLowerCase()).toString('base64')}`;

    // Buscar usuario existente por username
    const foundUser = await this.usersCollection.findOne({
      $or: [
        { discordId },
        { discordUsername: { $regex: new RegExp(`^${discordUsername}`, 'i') } }
      ]
    });

    let user: User;

    if (foundUser) {
      // Usuario existe, actualizar si es necesario
      const updateData: Partial<User> = {
        nickname: nickname || foundUser.nickname,
        updatedAt: new Date(),
      };

      await this.usersCollection.updateOne(
        { _id: foundUser._id },
        { $set: updateData }
      );

      user = { ...foundUser, ...updateData } as User;
    } else {
      // Crear nuevo usuario
      const userData: CreateUserData = {
        discordId,
        discordUsername,
        nickname: nickname || discordUsername,
      };

      const newUser = createDefaultUser(userData);
      const result = await this.usersCollection.insertOne(newUser as User);

      user = {
        ...newUser,
        _id: result.insertedId,
      } as User;
    }

    // Verificar si está baneado
    if (user.banned) {
      throw new AppError(
        `Tu cuenta está baneada. Razón: ${user.banReason || 'No especificada'}`,
        403,
        'USER_BANNED' as any
      );
    }

    // Generar JWT
    const token = generateJWT({
      discordId: user.discordId!,
      discordUsername: user.discordUsername,
      discordAvatar: user.discordAvatar,
      isAdmin: user.isAdmin,
    });

    return { user, token };
  }
}
