/**
 * Tests Unitarios - Servicio de Autenticación
 * Cobblemon Los Pitufos - Backend API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Collection, ObjectId } from 'mongodb';
import { AuthService } from '../../../../src/modules/auth/auth.service.js';
import { User, CreateUserData } from '../../../../src/shared/types/user.types.js';
import { Errors } from '../../../../src/shared/middleware/error-handler.js';

describe('AuthService', () => {
  let authService: AuthService;
  let mockCollection: Partial<Collection<User>>;

  beforeEach(() => {
    mockCollection = {
      findOne: vi.fn(),
      insertOne: vi.fn(),
      updateOne: vi.fn(),
    };
    authService = new AuthService(mockCollection as Collection<User>);
  });

  describe('findOrCreateUser', () => {
    const userData: CreateUserData = {
      discordId: '123456789',
      discordUsername: 'testuser',
      discordAvatar: 'https://cdn.discordapp.com/avatars/123/abc.png',
      nickname: 'Test User',
    };

    it('debe crear un nuevo usuario si no existe', async () => {
      (mockCollection.findOne as any).mockResolvedValue(null);
      (mockCollection.insertOne as any).mockResolvedValue({
        insertedId: new ObjectId(),
      });

      const user = await authService.findOrCreateUser(userData);

      expect(mockCollection.findOne).toHaveBeenCalledWith({
        discordId: userData.discordId,
      });
      expect(mockCollection.insertOne).toHaveBeenCalled();
      expect(user.discordId).toBe(userData.discordId);
      expect(user.discordUsername).toBe(userData.discordUsername);
      expect(user.starterId).toBeNull();
      expect(user.isAdmin).toBe(false);
      expect(user.banned).toBe(false);
    });

    it('debe actualizar usuario existente', async () => {
      const existingUser: User = {
        _id: new ObjectId(),
        discordId: '123456789',
        discordUsername: 'oldusername',
        discordAvatar: 'old_avatar.png',
        nickname: 'Old Nickname',
        verified: false,
        starterId: null,
        starterIsShiny: false,
        starterGiven: false,
        rolledAt: null,
        pokemonParty: [],
        pcStorage: [],
        cobbleDollarsBalance: 0,
        isAdmin: false,
        banned: false,
        createdAt: new Date(),
      };

      (mockCollection.findOne as any).mockResolvedValue(existingUser);
      (mockCollection.updateOne as any).mockResolvedValue({ modifiedCount: 1 });

      const user = await authService.findOrCreateUser(userData);

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { discordId: userData.discordId },
        expect.objectContaining({
          $set: expect.objectContaining({
            discordUsername: userData.discordUsername,
            discordAvatar: userData.discordAvatar,
          }),
        })
      );
      expect(user.discordUsername).toBe(userData.discordUsername);
    });

    it('debe preservar nickname existente si no se proporciona uno nuevo', async () => {
      const existingUser: User = {
        _id: new ObjectId(),
        discordId: '123456789',
        discordUsername: 'testuser',
        nickname: 'Custom Nickname',
        verified: false,
        starterId: null,
        starterIsShiny: false,
        starterGiven: false,
        rolledAt: null,
        pokemonParty: [],
        pcStorage: [],
        cobbleDollarsBalance: 0,
        isAdmin: false,
        banned: false,
        createdAt: new Date(),
      };

      (mockCollection.findOne as any).mockResolvedValue(existingUser);
      (mockCollection.updateOne as any).mockResolvedValue({ modifiedCount: 1 });

      const user = await authService.findOrCreateUser({
        ...userData,
        nickname: undefined,
      });

      expect(user.nickname).toBe('Custom Nickname');
    });
  });

  describe('getUserByDiscordId', () => {
    it('debe retornar usuario si existe', async () => {
      const mockUser: User = {
        _id: new ObjectId(),
        discordId: '123456789',
        discordUsername: 'testuser',
        nickname: 'Test User',
        verified: false,
        starterId: null,
        starterIsShiny: false,
        starterGiven: false,
        rolledAt: null,
        pokemonParty: [],
        pcStorage: [],
        cobbleDollarsBalance: 0,
        isAdmin: false,
        banned: false,
        createdAt: new Date(),
      };

      (mockCollection.findOne as any).mockResolvedValue(mockUser);

      const user = await authService.getUserByDiscordId('123456789');

      expect(user).toEqual(mockUser);
    });

    it('debe lanzar error si usuario no existe', async () => {
      (mockCollection.findOne as any).mockResolvedValue(null);

      await expect(
        authService.getUserByDiscordId('999999999')
      ).rejects.toThrow('Usuario no encontrado');
    });
  });

  describe('checkUserBan', () => {
    it('debe permitir usuario no baneado', async () => {
      const mockUser: User = {
        _id: new ObjectId(),
        discordId: '123456789',
        discordUsername: 'testuser',
        nickname: 'Test User',
        verified: false,
        starterId: null,
        starterIsShiny: false,
        starterGiven: false,
        rolledAt: null,
        pokemonParty: [],
        pcStorage: [],
        cobbleDollarsBalance: 0,
        isAdmin: false,
        banned: false,
        createdAt: new Date(),
      };

      (mockCollection.findOne as any).mockResolvedValue(mockUser);

      await expect(
        authService.checkUserBan('123456789')
      ).resolves.not.toThrow();
    });

    it('debe lanzar error si usuario está baneado', async () => {
      const mockUser: User = {
        _id: new ObjectId(),
        discordId: '123456789',
        discordUsername: 'testuser',
        nickname: 'Test User',
        verified: false,
        starterId: null,
        starterIsShiny: false,
        starterGiven: false,
        rolledAt: null,
        pokemonParty: [],
        pcStorage: [],
        cobbleDollarsBalance: 0,
        isAdmin: false,
        banned: true,
        banReason: 'Violación de reglas',
        createdAt: new Date(),
      };

      (mockCollection.findOne as any).mockResolvedValue(mockUser);

      await expect(
        authService.checkUserBan('123456789')
      ).rejects.toThrow('Tu cuenta está baneada');
    });
  });
});
