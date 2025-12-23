/**
 * Utilidades para Generación y Validación de Códigos de Torneo
 * Cobblemon Los Pitufos - Backend API
 * 
 * Genera códigos únicos de 6 caracteres alfanuméricos para torneos.
 * Los códigos son case-insensitive y excluyen caracteres confusos (0, O, I, L, 1).
 */

// Caracteres permitidos (excluye 0, O, I, L, 1 para evitar confusión)
const ALLOWED_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const MAX_GENERATION_ATTEMPTS = 100;

/**
 * Genera un código de torneo aleatorio de 6 caracteres
 * @returns Código alfanumérico de 6 caracteres en mayúsculas
 */
export function generateTournamentCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * ALLOWED_CHARS.length);
    code += ALLOWED_CHARS[randomIndex];
  }
  return code;
}

/**
 * Valida el formato de un código de torneo
 * @param code - Código a validar
 * @returns true si el código tiene formato válido
 */
export function isValidTournamentCodeFormat(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }
  
  // Normalizar a mayúsculas
  const normalizedCode = code.toUpperCase().trim();
  
  // Verificar longitud exacta
  if (normalizedCode.length !== CODE_LENGTH) {
    return false;
  }
  
  // Verificar que todos los caracteres sean permitidos
  for (const char of normalizedCode) {
    if (!ALLOWED_CHARS.includes(char)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Normaliza un código de torneo (mayúsculas, sin espacios)
 * @param code - Código a normalizar
 * @returns Código normalizado o null si es inválido
 */
export function normalizeTournamentCode(code: string): string | null {
  if (!code || typeof code !== 'string') {
    return null;
  }
  
  const normalized = code.toUpperCase().trim();
  
  if (!isValidTournamentCodeFormat(normalized)) {
    return null;
  }
  
  return normalized;
}

/**
 * Genera un código único verificando contra códigos existentes
 * @param existingCodes - Set o array de códigos ya existentes
 * @returns Código único o null si no se pudo generar después de MAX_GENERATION_ATTEMPTS intentos
 */
export function generateUniqueTournamentCode(
  existingCodes: Set<string> | string[]
): string | null {
  const codesSet = existingCodes instanceof Set 
    ? existingCodes 
    : new Set(existingCodes.map(c => c.toUpperCase()));
  
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const code = generateTournamentCode();
    if (!codesSet.has(code)) {
      return code;
    }
  }
  
  // No se pudo generar un código único después de MAX_GENERATION_ATTEMPTS intentos
  return null;
}

/**
 * Genera un código único usando una función de verificación asíncrona
 * @param checkExists - Función que verifica si un código ya existe en la base de datos
 * @returns Código único
 * @throws Error si no se puede generar un código único después de MAX_GENERATION_ATTEMPTS intentos
 */
export async function generateUniqueTournamentCodeAsync(
  checkExists: (code: string) => Promise<boolean>
): Promise<string> {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const code = generateTournamentCode();
    const exists = await checkExists(code);
    if (!exists) {
      return code;
    }
  }
  
  throw new Error(
    `No se pudo generar un código único después de ${MAX_GENERATION_ATTEMPTS} intentos. ` +
    'Esto puede indicar que hay demasiados torneos activos.'
  );
}

/**
 * Información sobre el formato de códigos de torneo
 */
export const TOURNAMENT_CODE_INFO = {
  length: CODE_LENGTH,
  allowedChars: ALLOWED_CHARS,
  maxGenerationAttempts: MAX_GENERATION_ATTEMPTS,
  description: 'Código alfanumérico de 6 caracteres (sin 0, O, I, L, 1)',
};
