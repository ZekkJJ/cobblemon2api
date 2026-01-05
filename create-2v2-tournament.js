/**
 * Script para crear un torneo 2v2 de prueba (sin iniciar)
 * Los mismos participantes y equipos pero en estado "registration"
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cobblemon-pitufos';

async function createTournament() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Conectado a MongoDB');
    
    const db = client.db();
    const tournaments = db.collection('tournaments');
    
    // Generar nuevo código único
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Fecha de inicio en 1 hora desde ahora
    const startDate = new Date(Date.now() + 60 * 60 * 1000);
    
    const tournament = {
      name: "2v2 TORNEO NUEVO",
      description: "Torneo 2v2 - Inscripciones abiertas",
      code: code,
      status: "registration", // NO iniciado
      battleFormat: "2v2",
      format: "6v6 Singles",
      bracketType: "single",
      maxParticipants: 16,
      registrationSeconds: 600, // 10 minutos de registro
      startDate: startDate,
      prizes: "Premio al campeón 2v2",
      rules: "Reglas estándar 2v2",
      createdBy: "Admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Participantes (los mismos 12 jugadores)
      participants: [
        {
          id: "2b4659d2",
          minecraftUuid: "6d7ca96f-2637-3413-9eb4-d2b94ce1e3f0",
          username: "TacoNacho",
          seed: 1,
          registeredAt: new Date()
        },
        {
          id: "b227109b",
          minecraftUuid: "493df1dc-645a-3e33-8e88-6240b143ec29",
          username: "ConoamarilloHD",
          seed: 2,
          registeredAt: new Date()
        },
        {
          id: "e1b9388e",
          minecraftUuid: "8d46362e-8228-3420-9c99-feaeeb46330c",
          username: "Lechuga07",
          seed: 3,
          registeredAt: new Date()
        },
        {
          id: "a3b841c8",
          minecraftUuid: "4fa07a77-3772-3168-a557-a863734f1744",
          username: "ZekkJJ",
          seed: 4,
          registeredAt: new Date()
        },
        {
          id: "223b7b21",
          minecraftUuid: "7bf5c247-01b3-3ced-a823-3a3b036cdf0c",
          username: "ElCherry",
          seed: 5,
          registeredAt: new Date()
        },
        {
          id: "40026a6a",
          minecraftUuid: "25969bf9-0ce7-3046-92df-dcd8c108a4e2",
          username: "NigBot_12",
          seed: 6,
          registeredAt: new Date()
        },
        {
          id: "ac5d4ae3",
          minecraftUuid: "61ffa53e-63ba-346d-8da4-b3f28b491791",
          username: "lepai#0",
          seed: 7,
          registeredAt: new Date()
        },
        {
          id: "523d5322",
          minecraftUuid: "87aaac4b-18a8-3317-b9f1-f40cf6c8d64b",
          username: "isabelamc",
          seed: 8,
          registeredAt: new Date()
        },
        {
          id: "30abfa10",
          minecraftUuid: "65e79152-937b-3e2d-906f-7638d822abed",
          username: "niq",
          seed: 9,
          registeredAt: new Date()
        },
        {
          id: "0c91320e",
          minecraftUuid: "37e8ff09-84ca-309f-ac15-167ee817b7cd",
          username: "PENEDULCE",
          seed: 10,
          registeredAt: new Date()
        },
        {
          id: "92607127",
          minecraftUuid: "f11bb974-62ff-3609-8204-3ee85a2a2772",
          username: "El bebé",
          seed: 11,
          registeredAt: new Date()
        },
        {
          id: "ac1a7654",
          minecraftUuid: "08ea0827-884a-3baa-a159-8b3a10b7b0e9",
          username: "Carlos",
          seed: 12,
          registeredAt: new Date()
        }
      ],
      
      // Bracket con equipos ya formados pero matches vacíos (no iniciado)
      bracket: {
        battleFormat: "2v2",
        teams: [
          {
            id: "c192c01e",
            name: "TacoNacho & Carlos",
            combinedSeed: 13,
            player1: {
              id: "2b4659d2",
              minecraftUuid: "6d7ca96f-2637-3413-9eb4-d2b94ce1e3f0",
              username: "TacoNacho",
              seed: 1,
              registeredAt: new Date()
            },
            player2: {
              id: "ac1a7654",
              minecraftUuid: "08ea0827-884a-3baa-a159-8b3a10b7b0e9",
              username: "Carlos",
              seed: 12,
              registeredAt: new Date()
            }
          },
          {
            id: "dee9634e",
            name: "ConoamarilloHD & El bebé",
            combinedSeed: 13,
            player1: {
              id: "b227109b",
              minecraftUuid: "493df1dc-645a-3e33-8e88-6240b143ec29",
              username: "ConoamarilloHD",
              seed: 2,
              registeredAt: new Date()
            },
            player2: {
              id: "92607127",
              minecraftUuid: "f11bb974-62ff-3609-8204-3ee85a2a2772",
              username: "El bebé",
              seed: 11,
              registeredAt: new Date()
            }
          },
          {
            id: "5121d923",
            name: "Lechuga07 & PENEDULCE",
            combinedSeed: 13,
            player1: {
              id: "e1b9388e",
              minecraftUuid: "8d46362e-8228-3420-9c99-feaeeb46330c",
              username: "Lechuga07",
              seed: 3,
              registeredAt: new Date()
            },
            player2: {
              id: "0c91320e",
              minecraftUuid: "37e8ff09-84ca-309f-ac15-167ee817b7cd",
              username: "PENEDULCE",
              seed: 10,
              registeredAt: new Date()
            }
          },
          {
            id: "f250dd0b",
            name: "ZekkJJ & niq",
            combinedSeed: 13,
            player1: {
              id: "a3b841c8",
              minecraftUuid: "4fa07a77-3772-3168-a557-a863734f1744",
              username: "ZekkJJ",
              seed: 4,
              registeredAt: new Date()
            },
            player2: {
              id: "30abfa10",
              minecraftUuid: "65e79152-937b-3e2d-906f-7638d822abed",
              username: "niq",
              seed: 9,
              registeredAt: new Date()
            }
          },
          {
            id: "ed825e4c",
            name: "ElCherry & isabelamc",
            combinedSeed: 13,
            player1: {
              id: "223b7b21",
              minecraftUuid: "7bf5c247-01b3-3ced-a823-3a3b036cdf0c",
              username: "ElCherry",
              seed: 5,
              registeredAt: new Date()
            },
            player2: {
              id: "523d5322",
              minecraftUuid: "87aaac4b-18a8-3317-b9f1-f40cf6c8d64b",
              username: "isabelamc",
              seed: 8,
              registeredAt: new Date()
            }
          },
          {
            id: "073cd6d1",
            name: "NigBot_12 & lepai#0",
            combinedSeed: 13,
            player1: {
              id: "40026a6a",
              minecraftUuid: "25969bf9-0ce7-3046-92df-dcd8c108a4e2",
              username: "NigBot_12",
              seed: 6,
              registeredAt: new Date()
            },
            player2: {
              id: "ac5d4ae3",
              minecraftUuid: "61ffa53e-63ba-346d-8da4-b3f28b491791",
              username: "lepai#0",
              seed: 7,
              registeredAt: new Date()
            }
          }
        ],
        rounds: [] // Sin rondas aún - se generan al iniciar
      }
    };
    
    const result = await tournaments.insertOne(tournament);
    
    console.log('\n✅ Torneo 2v2 creado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID: ${result.insertedId}`);
    console.log(`Código: ${code}`);
    console.log(`Nombre: ${tournament.name}`);
    console.log(`Estado: ${tournament.status}`);
    console.log(`Formato: ${tournament.battleFormat}`);
    console.log(`Participantes: ${tournament.participants.length}`);
    console.log(`Equipos: ${tournament.bracket.teams.length}`);
    console.log(`Inicio: ${startDate.toLocaleString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

createTournament();
