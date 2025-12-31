/**
 * Tournament Betting Routes - Sistema de Apuestas para Torneos
 * Cobblemon Los Pitufos
 * 
 * Features:
 * - Apostar CobbleDollars en equipos/jugadores de torneos
 * - NO puedes apostar por tu propio equipo
 * - Ver equipo más apostado
 * - Historial de apuestas
 * - Payout automático cuando termina el match
 * 
 * ANTI-EXPLOIT: Uses locked_balances to prevent /syncnow exploit
 */

const express = require('express');
const router = express.Router();

/**
 * Initialize tournament betting routes
 */
function initTournamentBetsRoutes(getDb) {
  
  const getUsersCollection = () => getDb().collection('users');
  const getBetsCollection = () => getDb().collection('tournament_bets');
  const getLockedBalanceCollection = () => getDb().collection('locked_balances');
  const getTournamentsCollection = () => getDb().collection('tournaments');

  // Minimum and maximum bet amounts
  const MIN_BET = 100;
  const MAX_BET = 100000;
  const HOUSE_CUT = 0.05; // 5% house cut on winnings

  /**
   * Lock balance for betting (anti-exploit)
   */
  const lockBalance = async (uuid, amount, betId) => {
    await getLockedBalanceCollection().insertOne({
      minecraftUuid: uuid,
      amount: amount,
      type: 'tournament_bet',
      betId: betId,
      createdAt: new Date(),
    });
  };

  /**
   * Unlock balance after bet resolution
   */
  const unlockBalance = async (uuid, betId) => {
    await getLockedBalanceCollection().deleteOne({
      minecraftUuid: uuid,
      betId: betId,
      type: 'tournament_bet',
    });
  };

  // ============================================
  // GET /api/bets/match/:matchId - Get bets for a match
  // ============================================
  router.get('/match/:matchId', async (req, res) => {
    try {
      const { matchId } = req.params;
      
      const bets = await getBetsCollection()
        .find({ matchId, status: { $in: ['pending', 'won', 'lost'] } })
        .toArray();

      // Calculate totals per side
      const slot1Bets = bets.filter(b => b.betOn === 'slot1');
      const slot2Bets = bets.filter(b => b.betOn === 'slot2');
      
      const slot1Total = slot1Bets.reduce((sum, b) => sum + b.amount, 0);
      const slot2Total = slot2Bets.reduce((sum, b) => sum + b.amount, 0);
      const totalPool = slot1Total + slot2Total;

      // Calculate odds
      const slot1Odds = totalPool > 0 && slot1Total > 0 
        ? ((totalPool / slot1Total) * (1 - HOUSE_CUT)).toFixed(2) 
        : '2.00';
      const slot2Odds = totalPool > 0 && slot2Total > 0 
        ? ((totalPool / slot2Total) * (1 - HOUSE_CUT)).toFixed(2) 
        : '2.00';

      res.json({
        success: true,
        matchId,
        stats: {
          slot1: {
            totalBets: slot1Bets.length,
            totalAmount: slot1Total,
            odds: slot1Odds,
          },
          slot2: {
            totalBets: slot2Bets.length,
            totalAmount: slot2Total,
            odds: slot2Odds,
          },
          totalPool,
          houseCut: HOUSE_CUT,
        },
        recentBets: bets.slice(-10).map(b => ({
          username: b.username,
          amount: b.amount,
          betOn: b.betOn,
          createdAt: b.createdAt,
        })),
      });
    } catch (error) {
      console.error('[BETS] Error getting match bets:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });


  // ============================================
  // GET /api/bets/tournament/:tournamentId - Get all bets for tournament
  // ============================================
  router.get('/tournament/:tournamentId', async (req, res) => {
    try {
      const { tournamentId } = req.params;
      
      // Get tournament to check if it's 2v2
      const tournament = await getTournamentsCollection().findOne({ 
        $or: [
          { _id: tournamentId },
          { code: tournamentId }
        ]
      });

      if (!tournament) {
        return res.status(404).json({ success: false, error: 'Torneo no encontrado' });
      }

      const bets = await getBetsCollection()
        .find({ tournamentId: tournament._id.toString() })
        .sort({ createdAt: -1 })
        .toArray();

      // Calculate most bet team/player
      const betsByTarget = {};
      bets.forEach(bet => {
        const key = bet.targetId;
        if (!betsByTarget[key]) {
          betsByTarget[key] = { 
            targetId: key, 
            targetName: bet.targetName,
            totalAmount: 0, 
            betCount: 0 
          };
        }
        betsByTarget[key].totalAmount += bet.amount;
        betsByTarget[key].betCount++;
      });

      const sortedTargets = Object.values(betsByTarget)
        .sort((a, b) => b.totalAmount - a.totalAmount);

      const mostBetTarget = sortedTargets[0] || null;
      const totalPool = bets.reduce((sum, b) => sum + b.amount, 0);

      res.json({
        success: true,
        tournamentId: tournament._id.toString(),
        tournamentName: tournament.name,
        is2v2: tournament.battleFormat === '2v2',
        stats: {
          totalBets: bets.length,
          totalPool,
          mostBetTarget,
          topTargets: sortedTargets.slice(0, 5),
        },
        recentBets: bets.slice(0, 20).map(b => ({
          id: b._id,
          username: b.username,
          amount: b.amount,
          targetName: b.targetName,
          matchId: b.matchId,
          status: b.status,
          payout: b.payout,
          createdAt: b.createdAt,
        })),
      });
    } catch (error) {
      console.error('[BETS] Error getting tournament bets:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // POST /api/bets/place - Place a bet
  // ============================================
  router.post('/place', async (req, res) => {
    try {
      const { 
        discordId, 
        minecraftUuid,
        matchId, 
        tournamentId,
        betOn, // 'slot1' or 'slot2'
        targetId, // team or player ID being bet on
        targetName,
        amount 
      } = req.body;

      // Validate required fields
      if (!matchId || !tournamentId || !betOn || !targetId || !amount) {
        return res.status(400).json({ 
          success: false, 
          error: 'Faltan campos requeridos' 
        });
      }

      if (!discordId && !minecraftUuid) {
        return res.status(400).json({ 
          success: false, 
          error: 'Se requiere discordId o minecraftUuid' 
        });
      }

      // Validate amount
      if (typeof amount !== 'number' || amount < MIN_BET || amount > MAX_BET) {
        return res.status(400).json({ 
          success: false, 
          error: `La apuesta debe ser entre ${MIN_BET.toLocaleString()} y ${MAX_BET.toLocaleString()} CD` 
        });
      }

      // Find user
      const userQuery = discordId 
        ? { discordId } 
        : { minecraftUuid };
      const user = await getUsersCollection().findOne(userQuery);

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: 'Usuario no encontrado. Debes estar verificado.' 
        });
      }

      // Get tournament to validate
      const tournament = await getTournamentsCollection().findOne({
        $or: [
          { _id: tournamentId },
          { code: tournamentId }
        ]
      });

      if (!tournament) {
        return res.status(404).json({ success: false, error: 'Torneo no encontrado' });
      }

      // Check if tournament is active
      if (tournament.status !== 'active') {
        return res.status(400).json({ 
          success: false, 
          error: 'Solo puedes apostar en torneos activos' 
        });
      }

      // Find the match
      const match = tournament.bracket?.rounds
        ?.flatMap(r => r.matches)
        ?.find(m => m.id === matchId);

      if (!match) {
        return res.status(404).json({ success: false, error: 'Match no encontrado' });
      }

      // Check match status - can only bet on pending or ready matches
      if (match.status !== 'pending' && match.status !== 'ready') {
        return res.status(400).json({ 
          success: false, 
          error: 'Solo puedes apostar antes de que empiece el match' 
        });
      }

      // ANTI-SELF-BET: Check if user is betting on themselves
      const is2v2 = tournament.battleFormat === '2v2';
      
      if (is2v2) {
        // Check if user is part of either team
        const team1Players = match.team1Players || [];
        const team2Players = match.team2Players || [];
        const userUuid = user.minecraftUuid;
        const userDiscord = user.discordId;

        // Find teams in bracket
        const team1 = tournament.bracket?.teams?.find(t => t.id === match.team1Id);
        const team2 = tournament.bracket?.teams?.find(t => t.id === match.team2Id);

        const isInTeam1 = team1 && (
          team1.player1?.minecraftUuid === userUuid || 
          team1.player2?.minecraftUuid === userUuid ||
          team1.player1?.discordId === userDiscord ||
          team1.player2?.discordId === userDiscord
        );
        const isInTeam2 = team2 && (
          team2.player1?.minecraftUuid === userUuid || 
          team2.player2?.minecraftUuid === userUuid ||
          team2.player1?.discordId === userDiscord ||
          team2.player2?.discordId === userDiscord
        );

        if ((betOn === 'slot1' && isInTeam1) || (betOn === 'slot2' && isInTeam2)) {
          return res.status(400).json({ 
            success: false, 
            error: '¡No puedes apostar por tu propio equipo! 🚫' 
          });
        }

        // Also can't bet if you're in the match at all
        if (isInTeam1 || isInTeam2) {
          return res.status(400).json({ 
            success: false, 
            error: '¡No puedes apostar en un match donde participas! 🚫' 
          });
        }
      } else {
        // 1v1 - check if user is either player
        const isPlayer1 = match.player1Id === user.minecraftUuid || 
                          tournament.participants.find(p => p.id === match.player1Id)?.discordId === user.discordId;
        const isPlayer2 = match.player2Id === user.minecraftUuid ||
                          tournament.participants.find(p => p.id === match.player2Id)?.discordId === user.discordId;

        if (isPlayer1 || isPlayer2) {
          return res.status(400).json({ 
            success: false, 
            error: '¡No puedes apostar en un match donde participas! 🚫' 
          });
        }
      }

      // ============================================
      // EDGE CASE: Check if user is in the tournament and could face the winner
      // Players can't bet on matches where the winner could be their next opponent
      // ============================================
      const userParticipant = tournament.participants.find(p => 
        p.minecraftUuid === user.minecraftUuid || 
        p.discordId === user.discordId ||
        p.id === user.minecraftUuid
      );

      if (userParticipant && !userParticipant.eliminated) {
        // User is an active participant - check if this match feeds into their bracket path
        
        // Find the match where the user is currently assigned or will be assigned
        const allMatches = tournament.bracket?.rounds?.flatMap((r, roundIndex) => 
          r.matches.map((m, matchIndex) => ({ ...m, roundIndex, matchIndex }))
        ) || [];

        // Find user's current/next match
        let userMatch = null;
        let userTeamId = null;

        if (is2v2) {
          // Find user's team
          const userTeam = tournament.bracket?.teams?.find(t => 
            t.player1?.minecraftUuid === user.minecraftUuid ||
            t.player2?.minecraftUuid === user.minecraftUuid ||
            t.player1?.discordId === user.discordId ||
            t.player2?.discordId === user.discordId
          );
          userTeamId = userTeam?.id;

          if (userTeamId) {
            // Find match where user's team is assigned
            userMatch = allMatches.find(m => 
              (m.team1Id === userTeamId || m.team2Id === userTeamId) &&
              m.status !== 'completed'
            );
          }
        } else {
          // 1v1 - find match where user is assigned
          userMatch = allMatches.find(m => 
            (m.player1Id === userParticipant.id || m.player2Id === userParticipant.id) &&
            m.status !== 'completed'
          );
        }

        if (userMatch) {
          // Check if the bet match's winner could face the user
          // This happens if both matches feed into the same next match
          const betMatch = allMatches.find(m => m.id === matchId);
          
          if (betMatch && userMatch.id !== betMatch.id) {
            // Check if they're in the same bracket path
            // Matches in the same round that feed into the same next round match
            const betMatchNextId = betMatch.nextMatchId;
            const userMatchNextId = userMatch.nextMatchId;

            // If both feed into the same next match, user can't bet
            if (betMatchNextId && userMatchNextId && betMatchNextId === userMatchNextId) {
              return res.status(400).json({ 
                success: false, 
                error: '¡No puedes apostar en un match donde el ganador será tu próximo oponente! 🚫' 
              });
            }

            // Also check if the bet match IS the user's next match
            if (betMatch.id === userMatchNextId) {
              return res.status(400).json({ 
                success: false, 
                error: '¡No puedes apostar en tu próximo match! 🚫' 
              });
            }

            // Check if user's match feeds into the bet match (user could face winner later)
            if (userMatch.nextMatchId === betMatch.id) {
              return res.status(400).json({ 
                success: false, 
                error: '¡No puedes apostar en un match donde podrías enfrentar al ganador! 🚫' 
              });
            }

            // Deep check: trace the bracket path to see if they could meet
            // Get the round indices
            const betRound = betMatch.roundIndex;
            const userRound = userMatch.roundIndex;

            // If user is in an earlier round, check if paths could converge
            if (userRound <= betRound) {
              // Trace user's potential path forward
              let currentMatchId = userMatch.nextMatchId;
              let depth = 0;
              const maxDepth = 10; // Prevent infinite loops

              while (currentMatchId && depth < maxDepth) {
                if (currentMatchId === betMatch.id) {
                  return res.status(400).json({ 
                    success: false, 
                    error: '¡No puedes apostar en un match de tu camino en el bracket! 🚫' 
                  });
                }
                
                const nextMatch = allMatches.find(m => m.id === currentMatchId);
                currentMatchId = nextMatch?.nextMatchId;
                depth++;
              }
            }
          }
        }
      }

      // Check user balance
      const currentBalance = user.cobbleDollars || 0;
      if (currentBalance < amount) {
        return res.status(400).json({ 
          success: false, 
          error: `Balance insuficiente. Tienes ${currentBalance.toLocaleString()} CD` 
        });
      }

      // Check if user already bet on this match
      const existingBet = await getBetsCollection().findOne({
        matchId,
        $or: [
          { discordId: user.discordId },
          { minecraftUuid: user.minecraftUuid }
        ],
        status: 'pending'
      });

      if (existingBet) {
        return res.status(400).json({ 
          success: false, 
          error: 'Ya tienes una apuesta en este match' 
        });
      }

      // Deduct balance
      await getUsersCollection().updateOne(
        { _id: user._id },
        { 
          $inc: { cobbleDollars: -amount },
          $set: { lastBetAt: new Date() }
        }
      );

      // Create bet record
      const bet = {
        discordId: user.discordId,
        minecraftUuid: user.minecraftUuid,
        username: user.minecraftUsername || user.discordUsername || 'Unknown',
        matchId,
        tournamentId: tournament._id.toString(),
        tournamentName: tournament.name,
        betOn,
        targetId,
        targetName,
        amount,
        status: 'pending',
        createdAt: new Date(),
      };

      const result = await getBetsCollection().insertOne(bet);
      const betId = result.insertedId.toString();

      // Lock balance (anti-exploit)
      await lockBalance(user.minecraftUuid, amount, betId);

      console.log(`[BETS] ${user.minecraftUsername || user.discordId} bet ${amount} CD on ${targetName} in match ${matchId}`);

      // Get updated odds
      const allBets = await getBetsCollection()
        .find({ matchId, status: 'pending' })
        .toArray();

      const slot1Total = allBets.filter(b => b.betOn === 'slot1').reduce((sum, b) => sum + b.amount, 0);
      const slot2Total = allBets.filter(b => b.betOn === 'slot2').reduce((sum, b) => sum + b.amount, 0);
      const totalPool = slot1Total + slot2Total;

      res.json({
        success: true,
        message: `¡Apuesta de ${amount.toLocaleString()} CD realizada!`,
        bet: {
          id: betId,
          amount,
          targetName,
          potentialWin: Math.floor(amount * (totalPool / (betOn === 'slot1' ? slot1Total : slot2Total)) * (1 - HOUSE_CUT)),
        },
        newBalance: currentBalance - amount,
        matchStats: {
          slot1Total,
          slot2Total,
          totalPool,
        }
      });
    } catch (error) {
      console.error('[BETS] Error placing bet:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });


  // ============================================
  // POST /api/bets/resolve/:matchId - Resolve bets for a match (called when match ends)
  // ============================================
  router.post('/resolve/:matchId', async (req, res) => {
    try {
      const { matchId } = req.params;
      const { winnerId, winnerSlot } = req.body; // 'slot1' or 'slot2'

      if (!winnerId || !winnerSlot) {
        return res.status(400).json({ 
          success: false, 
          error: 'winnerId and winnerSlot are required' 
        });
      }

      // Get all pending bets for this match
      const pendingBets = await getBetsCollection()
        .find({ matchId, status: 'pending' })
        .toArray();

      if (pendingBets.length === 0) {
        return res.json({ 
          success: true, 
          message: 'No hay apuestas pendientes para este match',
          resolved: 0 
        });
      }

      // Calculate pool
      const slot1Total = pendingBets.filter(b => b.betOn === 'slot1').reduce((sum, b) => sum + b.amount, 0);
      const slot2Total = pendingBets.filter(b => b.betOn === 'slot2').reduce((sum, b) => sum + b.amount, 0);
      const totalPool = slot1Total + slot2Total;
      const winnerPool = winnerSlot === 'slot1' ? slot1Total : slot2Total;

      let totalPaidOut = 0;
      let winnersCount = 0;
      let losersCount = 0;

      for (const bet of pendingBets) {
        const isWinner = bet.betOn === winnerSlot;
        
        if (isWinner) {
          // Calculate payout: (bet amount / winner pool) * total pool * (1 - house cut)
          const payout = Math.floor((bet.amount / winnerPool) * totalPool * (1 - HOUSE_CUT));
          
          // Pay out to user
          await getUsersCollection().updateOne(
            { 
              $or: [
                { discordId: bet.discordId },
                { minecraftUuid: bet.minecraftUuid }
              ]
            },
            { $inc: { cobbleDollars: payout } }
          );

          // Update bet status
          await getBetsCollection().updateOne(
            { _id: bet._id },
            { 
              $set: { 
                status: 'won',
                payout,
                resolvedAt: new Date(),
                winnerId,
              } 
            }
          );

          totalPaidOut += payout;
          winnersCount++;

          console.log(`[BETS] ${bet.username} WON ${payout} CD (bet ${bet.amount})`);
        } else {
          // Mark as lost
          await getBetsCollection().updateOne(
            { _id: bet._id },
            { 
              $set: { 
                status: 'lost',
                payout: 0,
                resolvedAt: new Date(),
                winnerId,
              } 
            }
          );
          losersCount++;
        }

        // Unlock balance
        await unlockBalance(bet.minecraftUuid, bet._id.toString());
      }

      const houseProfit = totalPool - totalPaidOut;

      console.log(`[BETS] Match ${matchId} resolved: ${winnersCount} winners, ${losersCount} losers, house profit: ${houseProfit}`);

      res.json({
        success: true,
        message: 'Apuestas resueltas',
        stats: {
          totalBets: pendingBets.length,
          winners: winnersCount,
          losers: losersCount,
          totalPool,
          totalPaidOut,
          houseProfit,
        }
      });
    } catch (error) {
      console.error('[BETS] Error resolving bets:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // POST /api/bets/cancel/:betId - Cancel a bet (before match starts)
  // ============================================
  router.post('/cancel/:betId', async (req, res) => {
    try {
      const { betId } = req.params;
      const { discordId, minecraftUuid } = req.body;

      const { ObjectId } = require('mongodb');
      
      const bet = await getBetsCollection().findOne({ 
        _id: new ObjectId(betId),
        status: 'pending'
      });

      if (!bet) {
        return res.status(404).json({ 
          success: false, 
          error: 'Apuesta no encontrada o ya resuelta' 
        });
      }

      // Verify ownership
      if (bet.discordId !== discordId && bet.minecraftUuid !== minecraftUuid) {
        return res.status(403).json({ 
          success: false, 
          error: 'No puedes cancelar esta apuesta' 
        });
      }

      // Check if match has started (get tournament and match)
      const tournament = await getTournamentsCollection().findOne({
        _id: bet.tournamentId
      });

      if (tournament) {
        const match = tournament.bracket?.rounds
          ?.flatMap(r => r.matches)
          ?.find(m => m.id === bet.matchId);

        if (match && (match.status === 'active' || match.status === 'completed')) {
          return res.status(400).json({ 
            success: false, 
            error: 'No puedes cancelar una apuesta de un match que ya empezó' 
          });
        }
      }

      // Refund the bet
      await getUsersCollection().updateOne(
        { 
          $or: [
            { discordId: bet.discordId },
            { minecraftUuid: bet.minecraftUuid }
          ]
        },
        { $inc: { cobbleDollars: bet.amount } }
      );

      // Update bet status
      await getBetsCollection().updateOne(
        { _id: bet._id },
        { 
          $set: { 
            status: 'cancelled',
            cancelledAt: new Date(),
          } 
        }
      );

      // Unlock balance
      await unlockBalance(bet.minecraftUuid, betId);

      console.log(`[BETS] ${bet.username} cancelled bet of ${bet.amount} CD`);

      res.json({
        success: true,
        message: `Apuesta cancelada. ${bet.amount.toLocaleString()} CD devueltos.`,
        refunded: bet.amount,
      });
    } catch (error) {
      console.error('[BETS] Error cancelling bet:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // GET /api/bets/user/:identifier - Get user's betting history
  // ============================================
  router.get('/user/:identifier', async (req, res) => {
    try {
      const { identifier } = req.params;
      
      const bets = await getBetsCollection()
        .find({
          $or: [
            { discordId: identifier },
            { minecraftUuid: identifier }
          ]
        })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

      // Calculate stats
      const totalBets = bets.length;
      const wins = bets.filter(b => b.status === 'won').length;
      const losses = bets.filter(b => b.status === 'lost').length;
      const pending = bets.filter(b => b.status === 'pending').length;
      const totalWagered = bets.reduce((sum, b) => sum + b.amount, 0);
      const totalWon = bets.filter(b => b.status === 'won').reduce((sum, b) => sum + (b.payout || 0), 0);
      const netProfit = totalWon - bets.filter(b => b.status !== 'cancelled').reduce((sum, b) => sum + b.amount, 0);

      res.json({
        success: true,
        stats: {
          totalBets,
          wins,
          losses,
          pending,
          winRate: totalBets > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : 0,
          totalWagered,
          totalWon,
          netProfit,
        },
        bets: bets.map(b => ({
          id: b._id,
          tournamentName: b.tournamentName,
          targetName: b.targetName,
          amount: b.amount,
          status: b.status,
          payout: b.payout,
          createdAt: b.createdAt,
          resolvedAt: b.resolvedAt,
        })),
      });
    } catch (error) {
      console.error('[BETS] Error getting user bets:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // GET /api/bets/leaderboard - Top bettors
  // ============================================
  router.get('/leaderboard', async (req, res) => {
    try {
      const pipeline = [
        { $match: { status: 'won' } },
        { 
          $group: {
            _id: { discordId: '$discordId', minecraftUuid: '$minecraftUuid' },
            username: { $first: '$username' },
            totalWins: { $sum: 1 },
            totalWon: { $sum: '$payout' },
            totalWagered: { $sum: '$amount' },
          }
        },
        { $sort: { totalWon: -1 } },
        { $limit: 20 }
      ];

      const leaderboard = await getBetsCollection().aggregate(pipeline).toArray();

      res.json({
        success: true,
        leaderboard: leaderboard.map((entry, index) => ({
          rank: index + 1,
          username: entry.username,
          totalWins: entry.totalWins,
          totalWon: entry.totalWon,
          totalWagered: entry.totalWagered,
          profit: entry.totalWon - entry.totalWagered,
        })),
      });
    } catch (error) {
      console.error('[BETS] Error getting leaderboard:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // GET /api/bets/active - Get all active betting opportunities
  // Optional query params: discordId or minecraftUuid to check restrictions
  // ============================================
  router.get('/active', async (req, res) => {
    try {
      const { discordId, minecraftUuid } = req.query;
      
      // Find user if provided (to check restrictions)
      let currentUser = null;
      if (discordId || minecraftUuid) {
        currentUser = await getUsersCollection().findOne(
          discordId ? { discordId } : { minecraftUuid }
        );
      }

      // Find active tournaments
      const activeTournaments = await getTournamentsCollection()
        .find({ status: 'active' })
        .toArray();

      const bettableMatches = [];

      for (const tournament of activeTournaments) {
        if (!tournament.bracket?.rounds) continue;

        const is2v2 = tournament.battleFormat === '2v2';
        
        // Check if user is a participant in this tournament
        let userParticipant = null;
        let userTeamId = null;
        let userMatch = null;
        
        if (currentUser) {
          userParticipant = tournament.participants.find(p => 
            p.minecraftUuid === currentUser.minecraftUuid || 
            p.discordId === currentUser.discordId ||
            p.id === currentUser.minecraftUuid
          );

          if (userParticipant && !userParticipant.eliminated) {
            // Find user's team (for 2v2)
            if (is2v2) {
              const userTeam = tournament.bracket?.teams?.find(t => 
                t.player1?.minecraftUuid === currentUser.minecraftUuid ||
                t.player2?.minecraftUuid === currentUser.minecraftUuid ||
                t.player1?.discordId === currentUser.discordId ||
                t.player2?.discordId === currentUser.discordId
              );
              userTeamId = userTeam?.id;
            }

            // Find user's current match
            const allMatches = tournament.bracket?.rounds?.flatMap((r, roundIndex) => 
              r.matches.map((m, matchIndex) => ({ ...m, roundIndex, matchIndex }))
            ) || [];

            if (is2v2 && userTeamId) {
              userMatch = allMatches.find(m => 
                (m.team1Id === userTeamId || m.team2Id === userTeamId) &&
                m.status !== 'completed'
              );
            } else if (userParticipant) {
              userMatch = allMatches.find(m => 
                (m.player1Id === userParticipant.id || m.player2Id === userParticipant.id) &&
                m.status !== 'completed'
              );
            }
          }
        }

        for (const round of tournament.bracket.rounds) {
          for (const match of round.matches) {
            // Only pending or ready matches can be bet on
            if (match.status !== 'pending' && match.status !== 'ready') continue;
            
            // Skip bye matches
            if (match.isBye) continue;

            // Get current bets for this match
            const bets = await getBetsCollection()
              .find({ matchId: match.id, status: 'pending' })
              .toArray();

            const slot1Total = bets.filter(b => b.betOn === 'slot1').reduce((sum, b) => sum + b.amount, 0);
            const slot2Total = bets.filter(b => b.betOn === 'slot2').reduce((sum, b) => sum + b.amount, 0);
            const totalPool = slot1Total + slot2Total;

            // Check if user is restricted from betting on this match
            let restricted = false;
            let restrictionReason = null;

            if (currentUser && userParticipant && !userParticipant.eliminated) {
              // Check if user is in this match
              if (is2v2) {
                if (match.team1Id === userTeamId || match.team2Id === userTeamId) {
                  restricted = true;
                  restrictionReason = 'Participas en este match';
                }
              } else {
                if (match.player1Id === userParticipant.id || match.player2Id === userParticipant.id) {
                  restricted = true;
                  restrictionReason = 'Participas en este match';
                }
              }

              // Check if this match is in user's bracket path
              if (!restricted && userMatch) {
                const allMatches = tournament.bracket?.rounds?.flatMap((r, ri) => 
                  r.matches.map((m, mi) => ({ ...m, roundIndex: ri, matchIndex: mi }))
                ) || [];
                
                const betMatch = allMatches.find(m => m.id === match.id);
                
                if (betMatch) {
                  // Check if both feed into same next match
                  if (userMatch.nextMatchId && betMatch.nextMatchId && 
                      userMatch.nextMatchId === betMatch.nextMatchId) {
                    restricted = true;
                    restrictionReason = 'El ganador será tu próximo oponente';
                  }
                  
                  // Check if bet match is user's next match
                  if (betMatch.id === userMatch.nextMatchId) {
                    restricted = true;
                    restrictionReason = 'Este es tu próximo match';
                  }

                  // Check if user's match feeds into bet match
                  if (userMatch.nextMatchId === betMatch.id) {
                    restricted = true;
                    restrictionReason = 'Podrías enfrentar al ganador';
                  }

                  // Trace bracket path
                  if (!restricted) {
                    let currentMatchId = userMatch.nextMatchId;
                    let depth = 0;
                    while (currentMatchId && depth < 10) {
                      if (currentMatchId === betMatch.id) {
                        restricted = true;
                        restrictionReason = 'Match en tu camino del bracket';
                        break;
                      }
                      const nextMatch = allMatches.find(m => m.id === currentMatchId);
                      currentMatchId = nextMatch?.nextMatchId;
                      depth++;
                    }
                  }
                }
              }
            }

            // Check if user already bet on this match
            let userBet = null;
            if (currentUser) {
              userBet = bets.find(b => 
                b.discordId === currentUser.discordId || 
                b.minecraftUuid === currentUser.minecraftUuid
              );
              if (userBet) {
                restricted = true;
                restrictionReason = 'Ya apostaste en este match';
              }
            }

            bettableMatches.push({
              matchId: match.id,
              tournamentId: tournament._id.toString(),
              tournamentName: tournament.name,
              tournamentCode: tournament.code,
              roundName: round.name,
              is2v2,
              slot1: {
                id: is2v2 ? match.team1Id : match.player1Id,
                name: is2v2 ? match.team1Name : tournament.participants.find(p => p.id === match.player1Id)?.username,
                totalBets: slot1Total,
                odds: totalPool > 0 && slot1Total > 0 
                  ? ((totalPool / slot1Total) * (1 - HOUSE_CUT)).toFixed(2) 
                  : '2.00',
              },
              slot2: {
                id: is2v2 ? match.team2Id : match.player2Id,
                name: is2v2 ? match.team2Name : tournament.participants.find(p => p.id === match.player2Id)?.username,
                totalBets: slot2Total,
                odds: totalPool > 0 && slot2Total > 0 
                  ? ((totalPool / slot2Total) * (1 - HOUSE_CUT)).toFixed(2) 
                  : '2.00',
              },
              totalPool,
              betCount: bets.length,
              // User-specific info
              restricted,
              restrictionReason,
              userBet: userBet ? {
                amount: userBet.amount,
                betOn: userBet.betOn,
              } : null,
            });
          }
        }
      }

      res.json({
        success: true,
        matches: bettableMatches,
        count: bettableMatches.length,
      });
    } catch (error) {
      console.error('[BETS] Error getting active bets:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

module.exports = { initTournamentBetsRoutes };
