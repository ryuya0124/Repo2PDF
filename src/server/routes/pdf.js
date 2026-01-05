import { Hono } from 'hono';
import fs from 'fs/promises';
import path from 'path';
import { loadConfig, DATA_DIR } from '../config.js';
import { generatePDF } from '../utils/pdfGenerator.js';

const router = new Hono();

// 進捗状態を保存
export const progressMap = new Map();

// Generate PDF
router.post('/generate', async (c) => {
  const { repoId, paths, scope, sessionId: clientSessionId } = await c.req.json();
  const config = await loadConfig();
  
  const repo = config.repositories.find(r => r.id === repoId);
  if (!repo) return c.json({ error: 'Repository not found' }, 404);
  
  const excludePatterns = repo.excludePatterns || [];
  
  // クライアントから渡されたsessionIdを使用
  const sessionId = clientSessionId || `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const result = await generatePDF(repo, paths, scope, excludePatterns, progressMap, sessionId);
    
    // メタデータを保存
    setPdfMetadata(result.pdfId, { filename: result.filename });
    
    return c.json({ 
      success: true, 
      pdfId: result.pdfId,
      filename: result.filename,
      skippedFiles: result.skippedFiles,
      stats: result.stats
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  } finally {
    // 完了後、進捗データを削除
    setTimeout(() => progressMap.delete(sessionId), 5000);
  }
});

// Get progress
router.get('/progress/:sessionId', async (c) => {
  const { sessionId } = c.req.param();
  const progress = progressMap.get(sessionId);
  
  if (!progress) {
    return c.json({ error: 'Session not found' }, 404);
  }
  
  return c.json(progress);
});

// PDF metadata storage
const pdfMetadataMap = new Map();

export function setPdfMetadata(pdfId, metadata) {
  pdfMetadataMap.set(pdfId, metadata);
  // 1時間後に削除
  setTimeout(() => pdfMetadataMap.delete(pdfId), 3600000);
}

// Get PDF
router.get('/:id', async (c) => {
  const { id } = c.req.param();
  const pdfPath = path.join(DATA_DIR, `${id}.pdf`);
  const metadata = pdfMetadataMap.get(id);
  const filename = metadata?.filename || `source-${id}.pdf`;
  
  try {
    const pdfBuffer = await fs.readFile(pdfPath);
    c.header('Content-Type', 'application/pdf');
    c.header('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    return c.body(pdfBuffer);
  } catch {
    return c.json({ error: 'PDF not found' }, 404);
  }
});

// Download PDF
router.get('/:id/download', async (c) => {
  const { id } = c.req.param();
  const pdfPath = path.join(DATA_DIR, `${id}.pdf`);
  const metadata = pdfMetadataMap.get(id);
  const filename = metadata?.filename || `source-${id}.pdf`;
  
  try {
    const pdfBuffer = await fs.readFile(pdfPath);
    c.header('Content-Type', 'application/pdf');
    c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    return c.body(pdfBuffer);
  } catch {
    return c.json({ error: 'PDF not found' }, 404);
  }
});

export default router;
