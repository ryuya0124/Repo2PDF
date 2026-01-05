import { Hono } from 'hono';
import fs from 'fs/promises';
import path from 'path';
import { loadConfig } from '../config.js';

const router = new Hono();

// Get file tree
router.get('/:id/tree', async (c) => {
  const { id } = c.req.param();
  const subpath = c.req.query('path') || '';
  const config = await loadConfig();
  
  const repo = config.repositories.find(r => r.id === id);
  if (!repo) return c.json({ error: 'Repository not found' }, 404);
  
  const targetPath = path.join(repo.path, subpath);
  const excludePatterns = repo.excludePatterns || [];
  
  try {
    const items = await fs.readdir(targetPath, { withFileTypes: true });
    const tree = await Promise.all(
      items
        .filter(item => !item.name.startsWith('.git') && !excludePatterns.includes(item.name))
        .map(async (item) => {
          const itemPath = path.join(subpath, item.name);
          const stat = await fs.stat(path.join(targetPath, item.name));
          return {
            name: item.name,
            path: itemPath,
            type: item.isDirectory() ? 'directory' : 'file',
            size: stat.size,
            modified: stat.mtime.toISOString()
          };
        })
    );
    
    tree.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    
    return c.json(tree);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Get file content
router.get('/:id/file', async (c) => {
  const { id } = c.req.param();
  const filePath = c.req.query('path') || '';
  const config = await loadConfig();
  
  const repo = config.repositories.find(r => r.id === id);
  if (!repo) return c.json({ error: 'Repository not found' }, 404);
  
  const targetPath = path.join(repo.path, filePath);
  
  try {
    const content = await fs.readFile(targetPath, 'utf-8');
    const stat = await fs.stat(targetPath);
    return c.json({
      content,
      name: path.basename(filePath),
      path: filePath,
      modified: stat.mtime.toISOString()
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

export default router;
