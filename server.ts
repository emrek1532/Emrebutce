import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// In-memory + persistent disk cache for encrypted family vaults
const STORAGE_DIR = path.join(__dirname, '.vault_storage');
if (!fs.existsSync(STORAGE_DIR)) {
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (err) {
    console.warn('Could not create STORAGE_DIR on disk, using memory fallback', err);
  }
}

const memoryVaultStore = new Map<string, any>();

function getVaultFilePath(vaultId: string): string {
  // sanitize vaultId to alphanumeric and dashes
  const safeId = vaultId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(STORAGE_DIR, `${safeId}.json`);
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ailve-budget-sync-server',
    timestamp: new Date().toISOString()
  });
});

// GET /api/sync/:vaultId - Fetch encrypted vault data
app.get('/api/sync/:vaultId', (req, res) => {
  const { vaultId } = req.params;
  if (!vaultId) {
    return res.status(400).json({ error: 'Vault ID is required' });
  }

  // Check memory first
  if (memoryVaultStore.has(vaultId)) {
    return res.json(memoryVaultStore.get(vaultId));
  }

  // Check disk
  const filePath = getVaultFilePath(vaultId);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      memoryVaultStore.set(vaultId, data);
      return res.json(data);
    } catch (err) {
      console.error('Error reading vault from disk:', err);
      return res.status(500).json({ error: 'Failed to read vault file' });
    }
  }

  // Not found
  return res.status(404).json({ error: 'Vault not found' });
});

// POST /api/sync/:vaultId - Save encrypted vault data
app.post('/api/sync/:vaultId', (req, res) => {
  const { vaultId } = req.params;
  const { ciphertext, iv, salt, version, updatedAt, clientInfo } = req.body;

  if (!vaultId || !ciphertext || !iv || !salt) {
    return res.status(400).json({ error: 'Missing encrypted payload fields (ciphertext, iv, salt)' });
  }

  const payload = {
    vaultId,
    ciphertext,
    iv,
    salt,
    version: version || 1,
    updatedAt: updatedAt || new Date().toISOString(),
    clientInfo: clientInfo || 'WebClient'
  };

  memoryVaultStore.set(vaultId, payload);

  const filePath = getVaultFilePath(vaultId);
  try {
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist to disk, stored in memory only:', err);
  }

  return res.json({
    success: true,
    vaultId,
    updatedAt: payload.updatedAt,
    message: 'Encrypted vault synchronized successfully'
  });
});

// Serve Service Worker & Manifest with proper headers
app.use((req, res, next) => {
  if (req.path === '/sw.js') {
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  }
  if (req.path === '/manifest.json') {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Production: serve built static files from dist
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Ailve Family Budget Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
