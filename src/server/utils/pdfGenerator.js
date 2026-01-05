import fs from 'fs/promises';
import path from 'path';
import PDFDocument from 'pdfkit';
import hljs from 'highlight.js';
import { detectLanguage, isBinaryFile, isSupported } from '../../utils/languageMap.js';
import { detectAndDecodeFile, normalizeLineEndings } from '../../utils/encoding.js';
import { parseHighlightedCode } from './highlightParser.js';
import { DATA_DIR } from '../config.js';

export async function generatePDF(repo, paths, scope, excludePatterns, progressMap, sessionId) {
  // 進捗送信ヘルパー
  const sendProgress = (data) => {
    progressMap.set(sessionId, { ...data, done: false });
    if (globalThis.broadcastProgress) {
      globalThis.broadcastProgress(sessionId, data);
    }
  };
  
  // 進捗初期化
  sendProgress({ current: 0, total: 0, message: 'ファイルを収集中...' });
  
  const filesToInclude = [];
  const skippedFiles = [];
  
  async function collectFiles(dirPath, relativePath = '') {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    for (const item of items) {
      // 隠しフォルダ(.で始まる)と除外パターンをスキップ
      if (item.name.startsWith('.') || excludePatterns.includes(item.name)) continue;
      
      const fullPath = path.join(dirPath, item.name);
      const relPath = path.join(relativePath, item.name);
      
      if (item.isDirectory()) {
        await collectFiles(fullPath, relPath);
      } else {
        // バイナリファイルまたはサポートされていないファイルをスキップ
        if (isBinaryFile(item.name)) {
          skippedFiles.push({ path: relPath, reason: '画像・動画・バイナリファイル' });
          continue;
        }
        
        if (!isSupported(item.name)) {
          const ext = item.name.substring(item.name.lastIndexOf('.'));
          skippedFiles.push({ path: relPath, reason: `未対応の拡張子: ${ext}` });
          continue;
        }
        
        filesToInclude.push({ fullPath, relativePath: relPath });
      }
    }
  }
  
  if (scope === 'repository') {
    await collectFiles(repo.path);
  } else if (scope === 'folder' && paths?.length) {
    for (const p of paths) {
      const fullPath = path.join(repo.path, p);
      try {
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          await collectFiles(fullPath, p);
        } else if (stat.isFile()) {
          // フォルダとして選択されたが実際はファイルの場合
          if (isBinaryFile(p)) {
            skippedFiles.push({ path: p, reason: '画像・動画・バイナリファイル' });
          } else if (!isSupported(p)) {
            const ext = p.substring(p.lastIndexOf('.'));
            skippedFiles.push({ path: p, reason: `未対応の拡張子: ${ext}` });
          } else {
            filesToInclude.push({ fullPath, relativePath: p });
          }
        }
      } catch (error) {
        console.error(`Error processing path ${p}:`, error);
      }
    }
  } else if (paths?.length) {
    for (const p of paths) {
      const fullPath = path.join(repo.path, p);
      try {
        const stat = await fs.stat(fullPath);
        if (stat.isFile()) {
          if (isBinaryFile(p)) {
            skippedFiles.push({ path: p, reason: '画像・動画・バイナリファイル' });
          } else if (!isSupported(p)) {
            const ext = p.substring(p.lastIndexOf('.'));
            skippedFiles.push({ path: p, reason: `未対応の拡張子: ${ext}` });
          } else {
            filesToInclude.push({ fullPath, relativePath: p });
          }
        } else if (stat.isDirectory()) {
          // 個別選択でディレクトリが含まれていた場合も収集
          await collectFiles(fullPath, p);
        }
      } catch (error) {
        console.error(`Error processing path ${p}:`, error);
      }
    }
  }
  
  // ファイル収集完了、総数を更新
  sendProgress({ current: 0, total: filesToInclude.length, message: 'PDF生成中...' });
  
  // Create PDF with enhanced contrast
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true
  });
  
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  
  const pdfPromise = new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
  
  // Files (Table of Contentsを削除し、最初のファイルから開始)
  let isFirstPage = true;
  let processedCount = 0;
  for (const file of filesToInclude) {
    if (!isFirstPage) {
      doc.addPage();
    }
    isFirstPage = false;
    
    const lang = detectLanguage(file.relativePath);
    if (!lang) continue; // 言語が検出できない場合はスキップ
    
    const stat = await fs.stat(file.fullPath);
    
    // Enhanced header with higher contrast
    doc.rect(50, 50, doc.page.width - 100, 40).fill('#0d1117');
    doc.fontSize(12).fillColor('#ffffff').font('Helvetica-Bold').text(file.relativePath, 60, 60);
    doc.fontSize(8).fillColor('#c9d1d9').font('Helvetica').text(
      `Language: ${lang} | Modified: ${stat.mtime.toLocaleString('en-US')}`,
      60, 75
    );
    
    doc.moveDown(3);
    
    try {
      // バッファとして読み込み、エンコーディングを検出
      const buffer = await fs.readFile(file.fullPath);
      const { encoding, content: rawContent } = await detectAndDecodeFile(buffer);
      
      // 改行コードを統一
      let content = normalizeLineEndings(rawContent);
      
      // Limit content for very large files
      const lines = content.split('\n');
      if (lines.length > 2000) {
        content = lines.slice(0, 2000).join('\n') + '\n\n... (切り捨て: ファイルが大きすぎます)';
      }
      
      // Syntax highlight
      let highlighted;
      try {
        highlighted = hljs.highlight(content, { language: lang }).value;
      } catch (error) {
        console.warn(`⚠️  シンタックスハイライトエラー (${lang}): ${file.relativePath}`, error.message);
        // フォールバックでauto-detect
        try {
          highlighted = hljs.highlightAuto(content).value;
        } catch {
          // 最終的にプレーンテキストとして扱う
          highlighted = content.split('\n').map(line => line).join('\n');
        }
      }
      
      const codeLines = content.split('\n');
      const highlightedLines = highlighted.split('\n');
      
      const lineNumberWidth = String(codeLines.length).length * 8 + 20;
      let y = doc.y;
      
      for (let i = 0; i < codeLines.length; i++) {
        if (y > doc.page.height - 70) {
          doc.addPage();
          y = 50;
        }
        
        // Line number with higher contrast
        doc.fontSize(8).fillColor('#24292e').font('Courier').text(
          String(i + 1).padStart(String(codeLines.length).length, ' '),
          50, y, { width: lineNumberWidth - 10, align: 'right' }
        );
        
        // Code with syntax highlighting
        const segments = parseHighlightedCode(highlightedLines[i] || '');
        let x = 50 + lineNumberWidth;
        
        for (const segment of segments) {
          if (x > doc.page.width - 50) break;
          
          const text = segment.text.replace(/\t/g, '  ');
          doc.fontSize(8).fillColor(segment.color).font('Courier').text(text, x, y, {
            continued: true,
            lineBreak: false
          });
          x += doc.widthOfString(text);
        }
        
        doc.text('', 50, y);
        y += 12;
      }
    } catch (error) {
      doc.fontSize(10).fillColor('#d73a49').font('Helvetica').text(`ファイル読み込みエラー: ${error.message}`);
      console.error(`❌ PDF生成エラー (${file.relativePath}):`, error);
    }
    
    // 進捗更新
    processedCount++;
    sendProgress({ 
      current: processedCount, 
      total: filesToInclude.length, 
      message: `PDF生成中... (${processedCount}/${filesToInclude.length})`
    });
  }
  
  // Page numbers with higher contrast
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor('#24292e').font('Helvetica').text(
      `ページ ${i + 1} / ${pageCount}`,
      50, doc.page.height - 30,
      { align: 'center', width: doc.page.width - 100 }
    );
  }
  
  doc.end();
  
  const pdfBuffer = await pdfPromise;
  const pdfId = Date.now().toString();
  const pdfPath = path.join(DATA_DIR, `${pdfId}.pdf`);
  await fs.writeFile(pdfPath, pdfBuffer);
  
  // 完了通知
  const doneProgress = { 
    current: filesToInclude.length, 
    total: filesToInclude.length, 
    message: 'PDF生成完了!',
    done: true 
  };
  progressMap.set(sessionId, doneProgress);
  if (globalThis.broadcastProgress) {
    globalThis.broadcastProgress(sessionId, doneProgress);
  }
  
  // ファイル名を生成
  let filename;
  if (scope === 'repository') {
    filename = `${repo.name}.pdf`;
  } else if (paths && paths.length === 1) {
    // 単一ファイル/フォルダの場合
    const baseName = path.basename(paths[0]).replace(/\.[^/.]+$/, '');
    filename = `${repo.name}_${baseName}.pdf`;
  } else if (paths && paths.length > 1) {
    // 複数選択の場合
    filename = `${repo.name}_${paths.length}files.pdf`;
  } else {
    filename = `${repo.name}.pdf`;
  }
  
  return {
    pdfId,
    filename,
    skippedFiles,
    stats: {
      included: filesToInclude.length,
      skipped: skippedFiles.length
    }
  };
}
