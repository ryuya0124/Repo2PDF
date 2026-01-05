import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { WebSocketServer } from 'ws';
import { loadConfig, saveConfig, DATA_DIR } from './server/config.js';
import repositoriesRouter from './server/routes/repositories.js';
import filesRouter from './server/routes/files.js';
import pdfRouter, { progressMap } from './server/routes/pdf.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPOS_DIR = path.join(DATA_DIR, 'repos');

// Ensure directories exist
await fs.mkdir(REPOS_DIR, { recursive: true });

const app = new Hono();

app.use('*', cors());

// WebSocket connections by sessionId
const wsClients = new Map();

// API Routes
const api = new Hono();

// Get config
api.get('/config', async (c) => {
  const config = await loadConfig();
  return c.json({ token: config.token ? '***' : '', repositories: config.repositories });
});

// Set token
api.post('/token', async (c) => {
  const { token } = await c.req.json();
  const config = await loadConfig();
  config.token = token;
  await saveConfig(config);
  return c.json({ success: true });
});

// Mount route handlers
api.route('/repositories', repositoriesRouter);
api.route('/repositories', filesRouter);
api.route('/pdf', pdfRouter);

app.route('/api', api);

// Production: Serve built files
if (process.env.NODE_ENV === 'production') {
  app.use('/*', serveStatic({ root: './dist' }));
  app.get('*', serveStatic({ path: './dist/index.html' }));
}

const port = process.env.NODE_ENV === 'production' ? 4000 : 4002;
const wsPort = process.env.NODE_ENV === 'production' ? 4001 : 4003;

console.log(`🚀 Server running at http://0.0.0.0:${port}`);
console.log(`🔌 WebSocket server running at ws://0.0.0.0:${wsPort}`);

// WebSocket Server for progress updates
const wss = new WebSocketServer({ port: wsPort });

wss.on('connection', (ws) => {
  let sessionId = null;
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'subscribe' && data.sessionId) {
        sessionId = data.sessionId;
        wsClients.set(sessionId, ws);
        ws.send(JSON.stringify({ type: 'subscribed', sessionId }));
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  });
  
  ws.on('close', () => {
    if (sessionId) {
      wsClients.delete(sessionId);
    }
  });
});

// Export function to broadcast progress
export function broadcastProgress(sessionId, progress) {
  const ws = wsClients.get(sessionId);
  if (ws && ws.readyState === 1) { // WebSocket.OPEN
    ws.send(JSON.stringify({ type: 'progress', ...progress }));
  }
}

// Make broadcastProgress available globally for pdfGenerator
globalThis.broadcastProgress = broadcastProgress;

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0'
});
