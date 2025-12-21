/**
 * Property Tests - Autenticación
 * Cobblemon Los Pitufos - Backend API
 * 
 * Valida propiedades de correctitud del sistema de autenticación
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { Collection, ObjectId } from 'mongodb';
import { AuthService } from '../../src/modules/auth/auth.service.js';
import { User, CreateUserData } from '../../src/shared/types/user.types.js';
import { generateJWT, verifyJWT } from '../../src/config/auth.js';

// ============================================
// GENERADORES (ARBITRARIES)
// ============================================

/**
 * Generador de Discord ID válido
 */
const discordIdArbitrary = fc.bigInt({ min: 100000000000000000n, max: 999999999999999999n })
  .map(n => n.toString());

/**
 * Generador de username de Discord
 */
const discordUsernameArbitrary = fc.string({ minLength: 2, maxLength: 32 })
  .filter(s => /^[a-zA-Z0-9_]+$/.test(s));

/**
 * Generador de datos de usuario de Discord
 */
const createUserDataArbitrary: fc.Arbitrary<CreateUserData> = fc.record({
  discordId: discordIdArbitrary,
  discordUsername: discordUsernameArbitrary,
  discordAvatar: fc.option(fc.webUrl(), { nil: undefined }),
  nickname: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
});

/**
 * Generador de usuario completo
 */
const userArbitrary: fc.Arbitrary<User> = fc.record({
  _id: fc.constant(new ObjectId()),
  discordId: fc.option(discordIdArbitrary, { nil: null }),
  discordUsername: discordUsernameArbitrary,
  discordAvatar: fc.option(fc.webUrl(), { nil: undefined }),
  nickname: fc.string({ minLength: 1, maxLength: 50 }),
  minecraftUuid: fc.option(fc.uuid(), { nil: undefined }),
  minecraftUsername: fc.option(fc.string({ minLength: 3, maxLength: 16 }), { nil: undefined }),
  minecraftOnline: fc.option(fc.boolean(), { nil: undefined }),
  minecraftLastSeen: fc.option(fc.date().map(d => d.toISOString()), { nil: undefined }),
  verified: fc.boolean(),
  verifiedAt: fc.option(fc.date().map(d => d.toISOString()), { nil: undefined }),
  verificationCode: fc.option(fc.integer({ min: 10000, max: 99999 }).map(String), { nil: undefined }),
  starterId: fc.option(fc.integer({ min: 1, max: 27 }), { nil: null }),
  starterIsShiny: fc.boolean(),
  starterGiven: fc.boolean(),
  rolledAt: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
  pokemonParty: fc.constant([]),
  pcStorage: fc.constant([]),
  cobbleDollarsBalance: fc.integer({ min: 0, max: 1000000 }),
  badges: fc.option(fc.integer({ min: 0, max: 8 }), { nil: undefined }),
  playtime: fc.option(fc.integer({ min: 0, max: 100000 }), { nil: undefined }),
  groups: fc.option(fc.array(fc.string()), { nil: undefined }),
  isAdmin: fc.boolean(),
  banned: fc.boolean(),
  banReason: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  createdAt: fc.date(),
  updatedAt: fc.option(fc.date(), { nil: undefined }),
  syncedAt: fc.option(fc.date().map(d => d.toISOString()), { nil: undefined }),
});

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property Tests - Autenticación', () => {
  describe('Propiedad 3: Creación/Actualización de Usuario en Login', () => {
    it('debe crear nuevo usuario si no existe', async () => {
      await fc.assert(
        fc.asyncProperty(createUserDataArbitrary, async (userData) => {
          // Mock de colección
          const mockCollection = {
            findOne: vi.fn().mockResolvedValue(null),
            insertOne: vi.fn().mockResolvedValue({ insertedId: new ObjectId() }),
            updateOne: vi.fn(),
          } as any;

          const authService = new AuthService(mockCollection);
          const user = await authService.findOrCreateUser(userData);

          // Verificar que se creó el usuario
          expect(mockCollection.insertOne).toHaveBeenCalled();
          expect(user.discordId).toBe(userData.discordId);
          expect(user.discordUsername).toBe(userData.discordUsername);
          
          // Verificar valores por defecto
          expect(user.starterId).toBeNull();
          expect(user.isAdmin).toBe(false);
          expect(user.banned).toBe(false);
          expect(user.verified).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('debe actualizar usuario existente sin perder datos', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArbitrary,
          createUserDataArbitrary,
          async (existingUser, newData) => {
            // Asegurar que el discordId coincida
            existingUser.discordId = newData.discordId;

            const mockCollection = {
              findOne: vi.fn().mockResolvedValue(existingUser),
              insertOne: vi.fn(),
              updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
            } as any;

            const authService = new AuthService(mockCollection);
            const user = await authService.findOrCreateUser(newData);

            // Verificar que se actualizó, no se creó
            expect(mockCollection.updateOne).toHaveBeenCalled();
            expect(mockCollection.insertOne).not.toHaveBeenCalled();

            // Verificar que se actualizaron los datos de Discord
            expect(user.discordUsername).toBe(newData.discordUsername);

            // Verificar que se preservaron datos importantes
            expect(user.starterId).toBe(existingUser.starterId);
            expect(user.isAdmin).toBe(existingUser.isAdmin);
            expect(user.verified).toBe(existingUser.verified);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Propiedad 4: Protección de Rutas Autenticadas', () => {
    it('JWT generado debe ser verificable y contener datos correctos', () => {
      fc.assert(
        fc.property(
          discordIdArbitrary,
          discordUsernameArbitrary,
          fc.boolean(),
          (discordId, discordUsername, isAdmin) => {
            // Generar JWT
            const token = generateJWT({
              discordId,
              discordUsername,
              isAdmin,
            });

            // Verificar JWT
            const payload = verifyJWT(token);

            // Validar que los datos se preservaron
            expect(payload.discordId).toBe(discordId);
            expect(payload.discordUsername).toBe(discordUsername);
            expect(payload.isAdmin).toBe(isAdmin);
            expect(payload.iat).toBeDefined();
            expect(payload.exp).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('token inválido debe ser rechazado', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }),
          (invalidToken) => {
            // Intentar verificar token inválido
            expect(() => verifyJWT(invalidToken)).toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Propiedad: Verificación de Ban', () => {
    it('usuario baneado debe ser rechazado', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArbitrary,
          async (user) => {
            // Forzar que el usuario esté baneado
            user.banned = true;
            user.banReason = 'Test ban reason';

            const mockCollection = {
              findOne: vi.fn().mockResolvedValue(user),
            } as any;

            const authService = new AuthService(mockCollection);

            // Verificar que lanza error
            await expect(
              authService.checkUserBan(user.discordId!)
            ).rejects.toThrow('baneada');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('usuario no baneado debe ser permitido', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArbitrary,
          async (user) => {
            // Forzar que el usuario NO esté baneado
            user.banned = false;

            const mockCollection = {
              findOne: vi.fn().mockResolvedValue(user),
            } as any;

            const authService = new AuthService(mockCollection);

            // Verificar que no lanza error
            await expect(
              authService.checkUserBan(user.discordId!)
            ).resolves.not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Propiedad: Idempotencia de Login', () => {
    it('múltiples logins del mismo usuario deben producir el mismo resultado', async () => {
      await fc.assert(
        fc.asyncProperty(
          createUserDataArbitrary,
          async (userData) => {
            const mockCollection = {
              findOne: vi.fn()
                .mockResolvedValueOnce(null) // Primera vez: no existe
                .mockResolvedValue({ // Siguientes veces: existe
                  _id: new ObjectId(),
                  ...userData,
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
                }),
              insertOne: vi.fn().mockResolvedValue({ insertedId: new ObjectId() }),
              updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
            } as any;

            const authService = new AuthService(mockCollection);

            // Primer login (crea usuario)
            const user1 = await authService.findOrCreateUser(userData);

            // Segundo login (actualiza usuario)
            const user2 = await authService.findOrCreateUser(userData);

            // Verificar que ambos tienen el mismo discordId
            expect(user1.discordId).toBe(user2.discordId);
            expect(user1.discordUsername).toBe(user2.discordUsername);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
