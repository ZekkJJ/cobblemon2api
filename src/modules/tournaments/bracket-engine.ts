/**
 * Motor de Brackets para Torneos
 * Cobblemon Los Pitufos - Backend API
 * 
 * Genera y gestiona brackets de eliminación simple y doble.
 */

import {
  TournamentParticipant,
  TournamentMatch,
  TournamentRound,
  BracketStructure,
  VictoryType,
  getRoundName,
} from '../../shared/types/tournament.types.js';

/**
 * Motor de generación y gestión de brackets
 */
export class BracketEngine {
  
  /**
   * Genera un bracket completo para un torneo
   */
  generateBracket(
    participants: TournamentParticipant[],
    type: 'single' | 'double'
  ): BracketStructure {
    if (participants.length < 2) {
      throw new Error('Se necesitan al menos 2 participantes para generar un bracket');
    }

    // Ordenar por seed
    const sortedParticipants = [...participants].sort((a, b) => a.seed - b.seed);

    if (type === 'single') {
      return this.generateSingleEliminationBracket(sortedParticipants);
    } else {
      return this.generateDoubleEliminationBracket(sortedParticipants);
    }
  }

  /**
   * Genera bracket de eliminación simple
   */
  private generateSingleEliminationBracket(
    participants: TournamentParticipant[]
  ): BracketStructure {
    const n = participants.length;
    const totalRounds = Math.ceil(Math.log2(n));
    const bracketSize = Math.pow(2, totalRounds);
    
    // Asignar byes a los participantes con mejor seed
    const participantsWithByes = this.assignByes(participants, bracketSize);
    
    const rounds: TournamentRound[] = [];
    let matchCounter = 0;

    // Generar primera ronda
    const firstRoundMatches: TournamentMatch[] = [];
    for (let i = 0; i < bracketSize / 2; i++) {
      const player1 = participantsWithByes[i * 2];
      const player2 = participantsWithByes[i * 2 + 1];
      
      const isBye = player1 === null || player2 === null;
      const byeWinner = isBye ? (player1 || player2) : null;

      const match: TournamentMatch = {
        id: `match-${++matchCounter}`,
        tournamentId: '',
        roundNumber: 1,
        matchNumber: i + 1,
        player1Id: player1?.id ?? null,
        player2Id: player2?.id ?? null,
        winnerId: byeWinner?.id ?? null,
        loserId: null,
        victoryType: isBye ? 'BYE' : undefined,
        status: isBye ? 'completed' : 'ready',
        isBye,
        nextMatchId: null,
        adminOverride: false,
      };

      firstRoundMatches.push(match);
    }

    rounds.push({
      roundNumber: 1,
      name: getRoundName(1, totalRounds),
      matches: firstRoundMatches,
      isComplete: firstRoundMatches.every(m => m.status === 'completed'),
    });

    // Generar rondas siguientes
    for (let round = 2; round <= totalRounds; round++) {
      const prevRound = rounds[round - 2];
      if (!prevRound) continue;
      
      const matchesInRound = Math.floor(prevRound.matches.length / 2);
      const roundMatches: TournamentMatch[] = [];

      for (let i = 0; i < matchesInRound; i++) {
        const match: TournamentMatch = {
          id: `match-${++matchCounter}`,
          tournamentId: '',
          roundNumber: round,
          matchNumber: i + 1,
          player1Id: null,
          player2Id: null,
          winnerId: null,
          loserId: null,
          status: 'pending',
          isBye: false,
          nextMatchId: null,
          adminOverride: false,
        };

        roundMatches.push(match);
      }

      rounds.push({
        roundNumber: round,
        name: getRoundName(round, totalRounds),
        matches: roundMatches,
        isComplete: false,
      });
    }

    // Conectar matches (nextMatchId)
    for (let round = 0; round < rounds.length - 1; round++) {
      const currentRound = rounds[round];
      const nextRound = rounds[round + 1];
      if (!currentRound || !nextRound) continue;

      for (let i = 0; i < currentRound.matches.length; i++) {
        const nextMatchIndex = Math.floor(i / 2);
        const currentMatch = currentRound.matches[i];
        const nextMatch = nextRound.matches[nextMatchIndex];
        if (currentMatch && nextMatch) {
          currentMatch.nextMatchId = nextMatch.id;
        }
      }
    }

    // Propagar ganadores de byes
    this.propagateByeWinners(rounds);

    return {
      type: 'single',
      rounds,
      currentRound: 1,
      totalRounds,
      winnerId: null,
    };
  }


  /**
   * Genera bracket de eliminación doble
   */
  private generateDoubleEliminationBracket(
    participants: TournamentParticipant[]
  ): BracketStructure {
    // Por ahora, implementar como single elimination
    // TODO: Implementar eliminación doble completa
    const singleBracket = this.generateSingleEliminationBracket(participants);
    return {
      ...singleBracket,
      type: 'double',
      losersRounds: [],
    };
  }

  /**
   * Asigna byes a participantes con mejor seed cuando N no es potencia de 2
   */
  private assignByes(
    participants: TournamentParticipant[],
    bracketSize: number
  ): (TournamentParticipant | null)[] {
    const result: (TournamentParticipant | null)[] = new Array(bracketSize).fill(null);

    // Los participantes con mejor seed (menor número) reciben bye
    // Colocar participantes en posiciones de bracket estándar
    for (let i = 0; i < participants.length; i++) {
      const position = this.getStandardBracketPosition(i, bracketSize);
      const participant = participants[i];
      if (participant) {
        result[position] = participant;
      }
    }

    return result;
  }

  /**
   * Obtiene la posición estándar en el bracket para un seed dado
   */
  private getStandardBracketPosition(seed: number, bracketSize: number): number {
    if (bracketSize <= 2) return seed;
    
    const half = bracketSize / 2;
    if (seed < half) {
      return this.getStandardBracketPosition(seed, half) * 2;
    } else {
      return this.getStandardBracketPosition(bracketSize - 1 - seed, half) * 2 + 1;
    }
  }

  /**
   * Propaga ganadores de byes a la siguiente ronda
   */
  private propagateByeWinners(rounds: TournamentRound[]): void {
    for (let roundIndex = 0; roundIndex < rounds.length - 1; roundIndex++) {
      const currentRound = rounds[roundIndex];
      const nextRound = rounds[roundIndex + 1];
      if (!currentRound || !nextRound) continue;

      for (let i = 0; i < currentRound.matches.length; i++) {
        const match = currentRound.matches[i];
        if (!match) continue;
        
        if (match.status === 'completed' && match.winnerId && match.nextMatchId) {
          const nextMatch = nextRound.matches.find(m => m.id === match.nextMatchId);
          if (nextMatch) {
            if (i % 2 === 0) {
              nextMatch.player1Id = match.winnerId;
            } else {
              nextMatch.player2Id = match.winnerId;
            }

            if (nextMatch.player1Id && nextMatch.player2Id) {
              nextMatch.status = 'ready';
            }
          }
        }
      }
    }
  }

  /**
   * Avanza al ganador de un match a la siguiente ronda
   */
  advanceWinner(
    bracket: BracketStructure,
    matchId: string,
    winnerId: string,
    loserId: string,
    victoryType: VictoryType,
    adminOverride: boolean = false,
    adminId?: string
  ): BracketStructure {
    const updatedBracket = JSON.parse(JSON.stringify(bracket)) as BracketStructure;
    
    // Encontrar el match
    let foundMatch: TournamentMatch | null = null;
    let roundIndex = -1;
    let matchIndex = -1;

    for (let r = 0; r < updatedBracket.rounds.length; r++) {
      const round = updatedBracket.rounds[r];
      if (!round) continue;
      
      const idx = round.matches.findIndex(m => m.id === matchId);
      if (idx !== -1) {
        foundMatch = round.matches[idx] ?? null;
        roundIndex = r;
        matchIndex = idx;
        break;
      }
    }

    if (!foundMatch) {
      throw new Error(`Match ${matchId} no encontrado`);
    }

    // Actualizar match
    foundMatch.winnerId = winnerId;
    foundMatch.loserId = loserId;
    foundMatch.victoryType = victoryType;
    foundMatch.status = 'completed';
    foundMatch.completedAt = new Date().toISOString();
    foundMatch.adminOverride = adminOverride;
    if (adminId) foundMatch.adminId = adminId;

    // Verificar si la ronda está completa
    const currentRound = updatedBracket.rounds[roundIndex];
    if (currentRound) {
      currentRound.isComplete = currentRound.matches.every(m => m.status === 'completed');
    }

    // Avanzar ganador a siguiente match
    if (foundMatch.nextMatchId && roundIndex + 1 < updatedBracket.rounds.length) {
      const nextRound = updatedBracket.rounds[roundIndex + 1];
      if (nextRound) {
        const nextMatch = nextRound.matches.find(m => m.id === foundMatch!.nextMatchId);
        if (nextMatch) {
          if (matchIndex % 2 === 0) {
            nextMatch.player1Id = winnerId;
          } else {
            nextMatch.player2Id = winnerId;
          }

          if (nextMatch.player1Id && nextMatch.player2Id) {
            nextMatch.status = 'ready';
          }
        }
      }
    } else {
      // Es la final - el ganador es el campeón
      updatedBracket.winnerId = winnerId;
    }

    // Actualizar ronda actual si la ronda está completa
    if (currentRound?.isComplete && roundIndex + 1 < updatedBracket.rounds.length) {
      updatedBracket.currentRound = roundIndex + 2;
    }

    return updatedBracket;
  }

  /**
   * Encuentra un match activo entre dos participantes
   */
  findActiveMatchBetween(
    bracket: BracketStructure,
    player1Id: string,
    player2Id: string
  ): TournamentMatch | null {
    for (const round of bracket.rounds) {
      for (const match of round.matches) {
        if (match.status === 'ready' || match.status === 'active') {
          const hasPlayer1 = match.player1Id === player1Id || match.player2Id === player1Id;
          const hasPlayer2 = match.player1Id === player2Id || match.player2Id === player2Id;
          
          if (hasPlayer1 && hasPlayer2) {
            return match;
          }
        }
      }
    }
    return null;
  }

  /**
   * Encuentra un match por ID
   */
  findMatchById(bracket: BracketStructure, matchId: string): TournamentMatch | null {
    for (const round of bracket.rounds) {
      const match = round.matches.find(m => m.id === matchId);
      if (match) return match;
    }
    return null;
  }

  /**
   * Marca un match como requiriendo intervención de admin
   */
  markMatchAsRequiresAdmin(bracket: BracketStructure, matchId: string): BracketStructure {
    const updatedBracket = JSON.parse(JSON.stringify(bracket)) as BracketStructure;
    
    for (const round of updatedBracket.rounds) {
      const match = round.matches.find(m => m.id === matchId);
      if (match) {
        match.status = 'requires_admin';
        break;
      }
    }

    return updatedBracket;
  }

  /**
   * Maneja la remoción de un participante del bracket
   */
  handleParticipantRemoval(
    bracket: BracketStructure,
    participantId: string
  ): BracketStructure {
    const updatedBracket = JSON.parse(JSON.stringify(bracket)) as BracketStructure;

    for (let roundIndex = 0; roundIndex < updatedBracket.rounds.length; roundIndex++) {
      const round = updatedBracket.rounds[roundIndex];
      if (!round) continue;
      
      for (let matchIndex = 0; matchIndex < round.matches.length; matchIndex++) {
        const match = round.matches[matchIndex];
        if (!match) continue;
        
        if ((match.player1Id === participantId || match.player2Id === participantId) &&
            (match.status === 'ready' || match.status === 'active' || match.status === 'pending')) {
          
          const opponentId = match.player1Id === participantId 
            ? match.player2Id 
            : match.player1Id;

          if (opponentId) {
            return this.advanceWinner(
              updatedBracket,
              match.id,
              opponentId,
              participantId,
              'FORFEIT'
            );
          } else {
            match.status = 'completed';
            match.victoryType = 'FORFEIT';
          }
        }
      }
    }

    return updatedBracket;
  }

  /**
   * Valida que todos los matches de una ronda estén completos
   */
  validateRoundComplete(bracket: BracketStructure, roundNumber: number): boolean {
    const round = bracket.rounds.find(r => r.roundNumber === roundNumber);
    if (!round) return false;
    return round.matches.every(m => m.status === 'completed');
  }

  /**
   * Obtiene los matches de la siguiente ronda
   */
  getNextRoundMatches(bracket: BracketStructure, currentRoundNumber: number): TournamentMatch[] {
    const nextRound = bracket.rounds.find(r => r.roundNumber === currentRoundNumber + 1);
    return nextRound?.matches ?? [];
  }

  /**
   * Calcula el número total de matches para N participantes
   */
  static calculateTotalMatches(participants: number, type: 'single' | 'double'): number {
    if (type === 'single') {
      return participants - 1;
    } else {
      return 2 * participants - 2;
    }
  }

  /**
   * Recalcula los seeds de los participantes
   */
  recalculateSeeds(
    participants: TournamentParticipant[],
    newOrder: number[]
  ): TournamentParticipant[] {
    return newOrder.map((originalIndex, newSeed) => {
      const participant = participants[originalIndex];
      if (!participant) {
        throw new Error(`Participante en índice ${originalIndex} no encontrado`);
      }
      return {
        ...participant,
        seed: newSeed + 1,
      };
    });
  }
}
