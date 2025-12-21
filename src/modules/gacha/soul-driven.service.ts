/**
 * Servicio Soul Driven
 * Cobblemon Los Pitufos - Backend API
 * 
 * Maneja la lógica del sistema gacha basado en personalidad
 */

import { Collection } from 'mongodb';
import { User } from '../../shared/types/user.types.js';
import { Starter, StarterWithSprites } from '../../shared/types/pokemon.types.js';
import { STARTERS_DATA, getStarterSprites } from '../../shared/data/starters.data.js';
import { AppError, Errors } from '../../shared/middleware/error-handler.js';
import { getDb } from '../../config/database.js';
import { env } from '../../config/env.js';
import { sendStarterWebhook } from '../../shared/utils/discord-webhook.js';

// Importar Groq solo si está disponible
let Groq: any = null;

// Función para cargar Groq dinámicamente
async function loadGroq() {
  if (Groq) return;
  try {
    const groqModule = await import('groq-sdk');
    Groq = groqModule.default;
  } catch (error) {
    console.warn('[SOUL DRIVEN] Groq SDK no disponible. Soul Driven no funcionará.');
  }
}

// Intentar cargar Groq al inicio
loadGroq().catch(() => {});

/**
 * Respuestas del cuestionario Soul Driven
 */
export interface SoulDrivenAnswers {
  combatStyle: string;      // Estilo de combate
  environment: string;       // Ambiente preferido
  personality: string;       // Personalidad
  companionValue: string;    // Valor en compañero
  strength: string;          // Mayor fortaleza
  dream: string;             // Sueño o meta
}

/**
 * Resultado de tirada Soul Driven
 */
export interface SoulDrivenResult {
  success: true;
  starter: StarterWithSprites;
  message: string;
  suggestedPokemon?: string[]; // Para debugging
}

export class SoulDrivenService {
  private groqClient: any = null;

  constructor(
    private usersCollection: Collection<User>,
    private startersCollection: Collection<Starter>
  ) {
    // Inicializar cliente Groq si está disponible
    if (Groq && env.GROQ_API_KEY) {
      this.groqClient = new Groq({
        apiKey: env.GROQ_API_KEY,
      });
    }
  }

  /**
   * Realiza una tirada Soul Driven basada en respuestas del cuestionario
   */
  async performSoulDrivenRoll(
    discordId: string,
    discordUsername: string,
    answers: SoulDrivenAnswers
  ): Promise<SoulDrivenResult> {
    if (!this.groqClient) {
      throw new AppError(
        'El sistema Soul Driven no está disponible en este momento',
        503
      );
    }

    const db = await getDb();
    const session = db.client.startSession();

    try {
      let result: SoulDrivenResult | null = null;

      await session.withTransaction(async () => {
        // Buscar o crear usuario
        let user = await this.usersCollection.findOne({ discordId }, { session });

        if (!user) {
          const newUser: Partial<User> = {
            discordId,
            discordUsername: discordUsername || 'Unknown',
            nickname: discordUsername || '',
            starterId: null,
            starterIsShiny: false,
            starterGiven: false,
            rolledAt: null,
            isAdmin: false,
            banned: false,
            verified: false,
            pokemonParty: [],
            pcStorage: [],
            cobbleDollarsBalance: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const insertResult = await this.usersCollection.insertOne(newUser as User, { session });
          user = { ...newUser, _id: insertResult.insertedId } as any;
        }

        // Verificar si ya hizo tirada
        if (user && user.starterId !== null) {
          throw new AppError('¡Ya has hecho tu tirada!', 400);
        }

        // Obtener starters disponibles
        const claimedStarters = await this.startersCollection.find({ isClaimed: true }, { session }).toArray();
        const claimedIds = new Set(claimedStarters.map(s => s.pokemonId));
        const availableStarters = STARTERS_DATA.filter(s => !claimedIds.has(s.pokemonId));

        if (availableStarters.length === 0) {
          throw new AppError('No hay starters disponibles', 400);
        }

        // Analizar personalidad con IA
        const suggestedPokemon = await this.analyzePersonality(answers, availableStarters);

        // Seleccionar con pesos (40%, 25%, 20%, 10%, 5%)
        const selectedStarter = this.selectWithWeights(suggestedPokemon);

        // 1% probabilidad de shiny
        const isShiny = Math.random() < 0.01;

        // Actualizar usuario
        await this.usersCollection.updateOne(
          { discordId },
          {
            $set: {
              starterId: selectedStarter.pokemonId,
              starterIsShiny: isShiny,
              rolledAt: new Date().toISOString(),
              updatedAt: new Date(),
            },
          },
          { session }
        );

        // Marcar starter como reclamado
        const nickname = discordUsername || user?.nickname || user?.discordUsername || 'Desconocido';
        
        await this.startersCollection.updateOne(
          { pokemonId: selectedStarter.pokemonId },
          {
            $set: {
              pokemonId: selectedStarter.pokemonId,
              name: selectedStarter.name,
              isClaimed: true,
              claimedBy: discordId,
              claimedByNickname: nickname,
              minecraftUsername: user?.minecraftUsername,
              claimedAt: new Date().toISOString(),
              starterIsShiny: isShiny,
              updatedAt: new Date(),
            },
          },
          { upsert: true, session }
        );

        // Obtener sprites
        const sprites = getStarterSprites(selectedStarter.pokemonId, isShiny);

        result = {
          success: true,
          starter: {
            ...selectedStarter,
            isShiny,
            sprites,
            isClaimed: true,
            claimedBy: nickname,
            claimedAt: new Date().toISOString(),
          },
          message: isShiny
            ? '🌟 ¡INCREÍBLE! ¡Tu alma ha atraído un SHINY!'
            : `¡Tu alma resuena con ${selectedStarter.nameEs || selectedStarter.name}!`,
          suggestedPokemon: suggestedPokemon.map(p => p.name),
        };

        // Enviar webhook de Discord (no bloqueante, fuera de la transacción)
        setImmediate(async () => {
          try {
            await sendStarterWebhook(discordId, nickname, {
              ...selectedStarter,
              isShiny,
              sprites,
            } as any);
          } catch (webhookError) {
            console.error('Webhook error (non-blocking):', webhookError);
          }
        });
      });

      if (!result) {
        throw new Error('La transacción no produjo resultado');
      }

      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('[SOUL DRIVEN SERVICE] Error en tirada Soul Driven:', error);
      throw new AppError('Error durante la tirada Soul Driven. Por favor intenta de nuevo.', 500);
    } finally {
      await session.endSession();
    }
  }

  /**
   * Analiza la personalidad usando IA y sugiere Pokémon compatibles
   */
  private async analyzePersonality(
    answers: SoulDrivenAnswers,
    availableStarters: typeof STARTERS_DATA
  ): Promise<typeof STARTERS_DATA> {
    try {
      // Crear lista de Pokémon disponibles
      const availablePokemonList = availableStarters
        .map(p => `${p.name} (${p.types.join('/')}) - ${p.description}`)
        .join('\n');

      // Formatear preguntas y respuestas
      const questionsAndAnswers = [
        { question: '¿Cuál es tu estilo de combate preferido?', answer: answers.combatStyle },
        { question: '¿Qué ambiente te gusta más?', answer: answers.environment },
        { question: '¿Cómo describirías tu personalidad?', answer: answers.personality },
        { question: '¿Qué valoras más en un compañero?', answer: answers.companionValue },
        { question: 'Describe tu mayor fortaleza:', answer: answers.strength },
        { question: '¿Cuál es tu mayor sueño o meta?', answer: answers.dream },
      ]
        .map((qa, i) => `${i + 1}. ${qa.question}\n   Respuesta: ${qa.answer}`)
        .join('\n\n');

      // Prompt para la IA
      const prompt = `Eres un psicólogo especializado en análisis de personalidad. Analiza el siguiente perfil:

${questionsAndAnswers}

Basándote en esta información, identifica los 5 rasgos de personalidad más dominantes de esta persona.

Para cada rasgo, relaciona qué criatura de esta lista sería más compatible con ese aspecto de su personalidad:

${availablePokemonList}

Responde ÚNICAMENTE en el formato exacto:
1. [Nombre del Pokemon]
2. [Nombre del Pokemon]
3. [Nombre del Pokemon]
4. [Nombre del Pokemon]
5. [Nombre del Pokemon]

Sin explicaciones, solo nombres. Usa SOLO los Pokémon listados arriba.`;

      // Llamar a Groq API
      const completion = await this.groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 150,
      });

      const aiResponse = completion.choices[0]?.message?.content?.trim() || '';
      console.log('[SOUL DRIVEN] Respuesta de IA:', aiResponse);

      // Parsear respuesta
      const lines = aiResponse.split('\n').filter((l: string) => l.trim());
      const suggestedPokemon: typeof STARTERS_DATA = [];

      for (const line of lines) {
        const match = line.match(/^\d+\.\s*(.+)$/);
        if (match) {
          const pokemonName = match[1].trim();
          const found = availableStarters.find(
            s =>
              s.name.toLowerCase() === pokemonName.toLowerCase() ||
              pokemonName.toLowerCase().includes(s.name.toLowerCase())
          );
          if (found && !suggestedPokemon.includes(found)) {
            suggestedPokemon.push(found);
          }
        }
      }

      // Fallback si la IA no sugirió Pokémon válidos
      if (suggestedPokemon.length === 0) {
        console.warn('[SOUL DRIVEN] IA no sugirió Pokémon válidos, usando aleatorio');
        const fallbackIndex = Math.floor(Math.random() * availableStarters.length);
        const fallback = availableStarters[fallbackIndex];
        return fallback ? [fallback] : [];
      }

      console.log('[SOUL DRIVEN] Pokémon sugeridos:', suggestedPokemon.map(p => p?.name).join(', '));

      return suggestedPokemon;
    } catch (error) {
      console.error('[SOUL DRIVEN] Error analizando personalidad:', error);
      // Fallback: selección aleatoria
      const fallbackIndex = Math.floor(Math.random() * availableStarters.length);
      const fallback = availableStarters[fallbackIndex];
      return fallback ? [fallback] : [];
    }
  }

  /**
   * Selecciona un Pokémon usando pesos (40%, 25%, 20%, 10%, 5%)
   */
  private selectWithWeights(suggestedPokemon: typeof STARTERS_DATA): typeof STARTERS_DATA[0] {
    const weights = [0.4, 0.25, 0.2, 0.1, 0.05];
    const random = Math.random();
    let cumulativeWeight = 0;
    let selectedIndex = 0;

    for (let i = 0; i < Math.min(suggestedPokemon.length, weights.length); i++) {
      cumulativeWeight += weights[i] || 0;
      if (random < cumulativeWeight) {
        selectedIndex = i;
        break;
      }
    }

    const selected = suggestedPokemon[selectedIndex];
    if (!selected) {
      throw new Error('No se pudo seleccionar un starter');
    }
    
    console.log('[SOUL DRIVEN] Seleccionado (pesos):', selected.name);

    return selected;
  }
}
