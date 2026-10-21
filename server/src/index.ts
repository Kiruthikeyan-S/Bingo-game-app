import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '../../shared/types';
import { RoomManager } from './game/roomManager';
import { setupSocketHandlers } from './socket/handlers';
import { DatabaseService } from './database/supabase';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || '*';

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Game Hub Multiplayer Server (Bingo • Chess • Ludo)',
  });
});

// Leaderboard API endpoint
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await DatabaseService.getLeaderboard();
    res.json({ success: true, data: leaderboard });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error fetching leaderboard' });
  }
});

// Match History API endpoint
app.get('/api/history', async (req, res) => {
  try {
    const playerId = typeof req.query.playerId === 'string' ? req.query.playerId : undefined;
    const history = await DatabaseService.getMatchHistory(playerId);
    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error fetching history' });
  }
});

// Initialize Socket.IO server
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const roomManager = new RoomManager();

// Setup handlers
setupSocketHandlers(io, roomManager);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`[Game Hub Server] Listening on port ${PORT}`);
  });
}

export { app, server, io, roomManager };
