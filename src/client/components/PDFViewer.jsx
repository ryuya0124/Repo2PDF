import React, { useState } from 'react';
import { Icons } from './Icons';

export function PDFViewer({ pdfId, metadata, onClose }) {
  const [showInfo, setShowInfo] = useState(true);
  const [zoom, setZoom] = useState(100);

  if (!pdfId) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-[#0a0e14]">
      {/* PDF表示エリア */}
      <div className="flex-1 flex flex-col">
        {/* ヘッダー - 高コントラスト化 */}
        <div className="h-16 bg-gradient-to-r from-[#1c2128] to-[#161b22] border-b border-[#3d444d] flex items-center justify-between px-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#238636] rounded-lg shadow-lg">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
                <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">PDF Preview</h2>
              <p className="text-sm text-[#c9d1d9]">{metadata?.filename || 'Document'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* ズームコントロール */}
            <div className="flex items-center gap-2 bg-[#21262d] border border-[#3d444d] rounded-lg px-2 py-1">
              <button
                onClick={() => setZoom(Math.max(50, zoom - 10))}
                className="p-1 hover:bg-[#30363d] rounded cursor-pointer text-[#c9d1d9] hover:text-white transition-colors"
                aria-label="Zoom out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-sm font-mono text-white min-w-[3.5rem] text-center font-semibold">{zoom}%</span>
              <button
                onClick={() => setZoom(Math.min(200, zoom + 10))}
                className="p-1 hover:bg-[#30363d] rounded cursor-pointer text-[#c9d1d9] hover:text-white transition-colors"
                aria-label="Zoom in"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={() => setZoom(100)}
                className="px-2 py-1 hover:bg-[#30363d] rounded cursor-pointer text-[#c9d1d9] hover:text-white transition-colors text-xs"
                aria-label="Reset zoom"
              >
                Reset
              </button>
            </div>
            
            {/* 情報パネル切り替え */}
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer font-medium text-sm border ${
                showInfo 
                  ? 'bg-[#388bfd]/20 text-[#58a6ff] border-[#388bfd]/50' 
                  : 'bg-[#21262d] text-[#c9d1d9] border-[#3d444d] hover:bg-[#30363d] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth={2} />
                  <line x1="12" y1="16" x2="12" y2="12" strokeWidth={2} strokeLinecap="round" />
                  <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth={2} strokeLinecap="round" />
                </svg>
                Info
              </div>
            </button>
            
            {/* ダウンロード */}
            <a
              href={`/api/pdf/${pdfId}/download`}
              download
              className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg transition-all cursor-pointer font-semibold text-sm inline-flex items-center gap-2 shadow-lg hover:shadow-[#238636]/50"
            >
              <Icons.Download />
              Download
            </a>
            
            {/* 閉じる */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#da3633] border border-[#3d444d] hover:border-[#da3633] transition-all cursor-pointer text-[#c9d1d9] hover:text-white"
              aria-label="Close"
            >
              <Icons.X />
            </button>
          </div>
        </div>
        
        {/* PDF iframe - ズーム対応 */}
        <div className="flex-1 bg-[#0d1117] overflow-auto">
          <div 
            className="w-full h-full flex items-center justify-center p-4"
            style={{ minHeight: '100%' }}
          >
            <div 
              className="shadow-2xl border border-[#3d444d] rounded-lg overflow-hidden transition-transform duration-300"
              style={{ 
                width: `${zoom}%`, 
                height: `${zoom}%`,
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            >
              <iframe
                src={`/api/pdf/${pdfId}`}
                className="w-full h-full border-0"
                title="PDF Preview"
                style={{ width: `${10000 / zoom}%`, height: `${10000 / zoom}%`, transform: `scale(${zoom / 100})`, transformOrigin: '0 0' }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* 情報サイドバー - 高コントラスト化 */}
      {showInfo && (
        <div className="w-80 bg-[#161b22] border-l border-[#3d444d] flex flex-col shadow-2xl">
          <div className="p-6 border-b border-[#3d444d]">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#58a6ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-4m0-4h.01" />
              </svg>
              Document Info
            </h3>
            
            {/* ファイル情報 - 統計カード */}
            <div className="space-y-3">
              <div className="bg-[#0d1117] border border-[#3d444d] rounded-lg p-4">
                <h4 className="text-xs font-semibold text-[#7d8590] uppercase tracking-wide mb-3">Statistics</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#c9d1d9]">Included Files</span>
                    <span className="font-bold text-[#3fb950] text-lg">{metadata?.stats?.included || 0}</span>
                  </div>
                  {metadata?.stats?.skipped > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#c9d1d9]">Skipped Files</span>
                      <span className="font-bold text-[#f85149] text-lg">{metadata.stats.skipped}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-[#0d1117] border border-[#3d444d] rounded-lg p-4">
                <h4 className="text-xs font-semibold text-[#7d8590] uppercase tracking-wide mb-3">Details</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-[#7d8590] mb-1">Repository</p>
                    <p className="text-sm text-white font-medium">{metadata?.repoName || 'Unknown'}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-[#7d8590] mb-1">File Name</p>
                    <p className="text-xs text-[#c9d1d9] font-mono break-all bg-[#161b22] px-2 py-1 rounded border border-[#3d444d]/50">{metadata?.filename || 'document.pdf'}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-[#7d8590] mb-1">Generated</p>
                    <p className="text-sm text-[#c9d1d9]">{metadata?.generatedAt ? new Date(metadata.generatedAt).toLocaleString('ja-JP') : new Date().toLocaleString('ja-JP')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* スキップされたファイル */}
          {metadata?.skippedFiles && metadata.skippedFiles.length > 0 && (
            <div className="flex-1 overflow-auto p-6">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#f85149]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Skipped Files
                <span className="ml-auto text-xs bg-[#f85149]/20 text-[#f85149] px-2 py-0.5 rounded-full font-mono">
                  {metadata.skippedFiles.length}
                </span>
              </h4>
              <div className="space-y-2">
                {metadata.skippedFiles.slice(0, 20).map((file, idx) => (
                  <div key={idx} className="p-3 bg-[#0d1117] border border-[#3d444d] rounded-lg hover:border-[#f85149]/30 transition-colors">
                    <p className="text-xs text-white font-mono mb-1 break-all">{file.path}</p>
                    <p className="text-xs text-[#7d8590]">{file.reason}</p>
                  </div>
                ))}
                {metadata.skippedFiles.length > 20 && (
                  <p className="text-xs text-[#7d8590] text-center pt-2 font-medium">
                    + {metadata.skippedFiles.length - 20} more files
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* ヘルプ - 高コントラスト */}
          <div className="p-6 border-t border-[#3d444d]">
            <div className="flex items-start gap-3 p-4 bg-[#388bfd]/10 border border-[#388bfd]/50 rounded-lg">
              <svg className="w-5 h-5 text-[#58a6ff] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm text-[#58a6ff] font-semibold mb-1">ヒント</p>
                <p className="text-xs text-[#c9d1d9]">Ctrl+F を使用してPDF内を検索できます</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
