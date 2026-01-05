import { Hono } from 'hono';
import fs from 'fs/promises';
import path from 'path';
import simpleGit from 'simple-git';
import { loadConfig, saveConfig } from '../config.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../../data');
const REPOS_DIR = path.join(DATA_DIR, 'repos');

const router = new Hono();

// Add repository
router.post('/', async (c) => {
  const { url, name, isPrivate } = await c.req.json();
  const config = await loadConfig();
  
  const repoId = Date.now().toString();
  const repoPath = path.join(REPOS_DIR, repoId);
  
  try {
    let cloneUrl = url;
    if (isPrivate && config.token) {
      const urlObj = new URL(url);
      cloneUrl = `https://${config.token}@${urlObj.host}${urlObj.pathname}`;
    }
    
    const git = simpleGit();
    await git.clone(cloneUrl, repoPath, ['--branch', 'main', '--single-branch']);
    
    config.repositories.push({
      id: repoId,
      name: name || url.split('/').pop().replace('.git', ''),
      url,
      isPrivate,
      path: repoPath,
      excludePatterns: ['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '__pycache__', 'venv', '.venv', 'target', 'bin', 'obj', 'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lockb'],
      addedAt: new Date().toISOString()
    });
    
    await saveConfig(config);
    return c.json({ success: true, id: repoId });
  } catch (error) {
    await fs.rm(repoPath, { recursive: true, force: true });
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update repository exclude patterns
router.post('/:id/exclude', async (c) => {
  const { id } = c.req.param();
  const { excludePatterns } = await c.req.json();
  const config = await loadConfig();
  
  const repo = config.repositories.find(r => r.id === id);
  if (!repo) return c.json({ error: 'Repository not found' }, 404);
  
  repo.excludePatterns = excludePatterns;
  await saveConfig(config);
  return c.json({ success: true });
});

// Delete repository
router.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const config = await loadConfig();
  
  const repo = config.repositories.find(r => r.id === id);
  if (repo) {
    await fs.rm(repo.path, { recursive: true, force: true });
    config.repositories = config.repositories.filter(r => r.id !== id);
    await saveConfig(config);
  }
  
  return c.json({ success: true });
});

// Pull repository
router.post('/:id/pull', async (c) => {
  const { id } = c.req.param();
  const config = await loadConfig();
  
  const repo = config.repositories.find(r => r.id === id);
  if (!repo) return c.json({ error: 'Repository not found' }, 404);
  
  try {
    const git = simpleGit(repo.path);
    await git.pull();
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default router;
