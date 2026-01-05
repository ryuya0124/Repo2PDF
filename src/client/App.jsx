import React, { useState, useEffect } from 'react';
import { Icons } from './components/Icons';
import { Modal } from './components/Modal';
import { TreeItem } from './components/FileTree';
import { FileViewer } from './components/FileViewer';
import { PDFViewer } from './components/PDFViewer';
import * as api from './api/client';

// Main App
export default function App() {
  const [repositories, setRepositories] = useState([]);
  const [token, setToken] = useState('');
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [fileTree, setFileTree] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [currentFile, setCurrentFile] = useState(null);
  const [pdfId, setPdfId] = useState(null);
  const [pdfMetadata, setPdfMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ message: '', current: 0, total: 0 });
  const [skippedFiles, setSkippedFiles] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddRepo, setShowAddRepo] = useState(false);
  const [showExcludeSettings, setShowExcludeSettings] = useState(false);
  const [newRepo, setNewRepo] = useState({ url: '', name: '', isPrivate: false });
  const [newToken, setNewToken] = useState('');
  const [excludePatterns, setExcludePatterns] = useState([]);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const config = await api.get('/config');
    setRepositories(config.repositories || []);
    setToken(config.token || '');
  };

  const saveToken = async () => {
    await api.post('/token', { token: newToken });
    setToken(newToken ? '***' : '');
    setShowSettings(false);
    setNewToken('');
  };

  const addRepository = async () => {
    if (!newRepo.url) return;
    setLoading(true);
    setProgress({ message: 'リポジトリをクローン中...', current: 0, total: 0 });
    try {
      const result = await api.post('/repositories', newRepo);
      if (result.success) {
        await loadConfig();
        setShowAddRepo(false);
        setNewRepo({ url: '', name: '', isPrivate: false });
      } else {
        alert(`Error: ${result.error}`);
      }
    } finally {
      setLoading(false);
      setProgress({ message: '', current: 0, total: 0 });
    }
  };

  const deleteRepository = async (id) => {
    if (!confirm('Delete this repository?')) return;
    await api.deleteRequest(`/repositories/${id}`);
    if (selectedRepo?.id === id) {
      setSelectedRepo(null);
      setFileTree([]);
    }
    await loadConfig();
  };

  const pullRepository = async (id) => {
    setLoading(true);
    try {
      await api.post(`/repositories/${id}/pull`);
      if (selectedRepo?.id === id) {
        await selectRepository(repositories.find(r => r.id === id));
      }
    } finally {
      setLoading(false);
    }
  };

  const selectRepository = async (repo) => {
    setSelectedRepo(repo);
    setSelectedFiles(new Set());
    setExpandedFolders(new Set());
    setCurrentFile(null);
    setExcludePatterns(repo.excludePatterns || []);
    const tree = await api.get(`/repositories/${repo.id}/tree`);
    setFileTree(tree);
  };

  const toggleFileSelect = (item) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(item.path)) {
      newSelected.delete(item.path);
    } else {
      newSelected.add(item.path);
    }
    setSelectedFiles(newSelected);
  };

  const toggleFolder = (path) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const openFile = async (item) => {
    const file = await api.get(`/repositories/${selectedRepo.id}/file?path=${encodeURIComponent(item.path)}`);
    setCurrentFile(file);
  };

  const generatePDF = async (scope) => {
    if (!selectedRepo) return;
    setLoading(true);
    setSkippedFiles([]);
    const paths = Array.from(selectedFiles);
    setProgress({ message: 'ファイルを収集中...', current: 0, total: 0, isIndeterminate: true });
    
    // セッションID生成
    const sessionId = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // ポーリングで進捗取得（確実に動作する方法）
    let pollingInterval = null;
    const startPolling = () => {
      pollingInterval = setInterval(async () => {
        try {
          const progress = await api.get(`/pdf/progress/${sessionId}`);
          if (progress && !progress.error) {
            setProgress({
              message: progress.message || 'PDF生成中...',
              current: progress.current || 0,
              total: progress.total || 0,
              isIndeterminate: !progress.total || progress.total === 0
            });
          }
        } catch (e) {
          // 進捗取得失敗は無視
        }
      }, 300);
    };
    
    startPolling();
    
    try {
      // PDF生成を実行
      const result = await api.post('/pdf/generate', { repoId: selectedRepo.id, paths, scope, sessionId });
      
      if (result.success) {
        const totalFiles = result.stats ? result.stats.included : 0;
        setProgress({ message: 'PDF生成完了!', current: totalFiles, total: totalFiles, isIndeterminate: false });
        if (result.skippedFiles && result.skippedFiles.length > 0) {
          setSkippedFiles(result.skippedFiles);
        }
        
        // 別タブでPDFビューアを開く
        const metadata = {
          repoName: selectedRepo.name,
          filename: result.filename || `${selectedRepo.name}.pdf`,
          stats: result.stats || { included: 0, skipped: 0 },
          skippedFiles: result.skippedFiles || [],
          generatedAt: new Date().toISOString()
        };
        // PDFビューアページを別タブで開く
        const viewerUrl = `/viewer.html?pdfId=${result.pdfId}&metadata=${encodeURIComponent(JSON.stringify(metadata))}`;
        window.open(viewerUrl, '_blank');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      if (pollingInterval) clearInterval(pollingInterval);
      setTimeout(() => {
        setLoading(false);
        setProgress({ message: '', current: 0, total: 0 });
      }, 1000);
    }
  };

  const saveExcludePatterns = async () => {
    if (!selectedRepo) return;
    await api.post(`/repositories/${selectedRepo.id}/exclude`, { excludePatterns });
    const config = await api.get('/config');
    setRepositories(config.repositories);
    const updated = config.repositories.find(r => r.id === selectedRepo.id);
    setSelectedRepo(updated);
    setShowExcludeSettings(false);
    await selectRepository(updated);
  };


  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#161b22] border-b border-[#30363d]">
        <div className="max-w-[1800px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#238636] to-[#2ea043] rounded-xl">
                <span className="text-white"><Icons.Code /></span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Source to PDF</h1>
                <p className="text-xs text-[#8b949e]">Export code with syntax highlighting</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddRepo(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg transition-colors cursor-pointer font-medium"
            >
              <Icons.Plus />
              <span>Add Repo</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-[#30363d] border border-[#3d444d] hover:border-[#58a6ff] transition-all cursor-pointer text-[#c9d1d9] hover:text-white"
              aria-label="Settings"
            >
              <Icons.Settings />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="pt-16 h-screen flex">
        {/* Sidebar */}
        <aside className="w-72 border-r border-[#3d444d] bg-[#0a0e14] flex flex-col">
          <div className="p-4 border-b border-[#3d444d]">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Repositories</h2>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {repositories.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#161b22] border border-[#3d444d] flex items-center justify-center">
                  <Icons.GitHub />
                </div>
                <p className="text-white text-sm font-medium">No repositories</p>
                <p className="text-[#7d8590] text-xs mt-1">Add a repository to get started</p>
              </div>
            ) : (
              <div className="space-y-1">
                {repositories.map((repo) => (
                  <div
                    key={repo.id}
                    onClick={() => selectRepository(repo)}
                    className={`group p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedRepo?.id === repo.id
                        ? 'bg-[#388bfd]/20 border border-[#388bfd] shadow-lg shadow-[#388bfd]/20'
                        : 'hover:bg-[#161b22] border border-transparent hover:border-[#3d444d]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={selectedRepo?.id === repo.id ? 'text-[#58a6ff]' : 'text-[#7d8590]'}><Icons.GitHub /></span>
                      <span className="font-medium text-white truncate flex-1">{repo.name}</span>
                      {repo.isPrivate && <span className="text-[#f0883e]"><Icons.Lock /></span>}
                    </div>
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); pullRepository(repo.id); }}
                        className="p-1.5 rounded hover:bg-[#30363d] text-[#c9d1d9] hover:text-[#58a6ff] transition-colors cursor-pointer"
                        title="Pull"
                      >
                        <Icons.RefreshCw />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteRepository(repo.id); }}
                        className="p-1.5 rounded hover:bg-[#30363d] text-[#c9d1d9] hover:text-[#f85149] transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 flex">
          {selectedRepo ? (
            <>
              {/* File Tree */}
              <div className="w-96 border-r border-[#3d444d] flex flex-col bg-[#0d1117]">
                <div className="p-4 border-b border-[#3d444d] flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white">{selectedRepo.name}</h3>
                    <p className="text-sm text-[#c9d1d9]">{selectedFiles.size} files selected</p>
                  </div>
                  <button
                    onClick={() => setShowExcludeSettings(true)}
                    className="p-2 rounded-lg hover:bg-[#30363d] border border-[#3d444d] hover:border-[#58a6ff] transition-all cursor-pointer text-[#c9d1d9] hover:text-white"
                    title="除外設定"
                  >
                    <Icons.Filter />
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-2">{fileTree.map((item) => (
                    <TreeItem
                      key={item.path}
                      item={item}
                      repoId={selectedRepo.id}
                      selectedFiles={selectedFiles}
                      onToggleSelect={toggleFileSelect}
                      onFileClick={openFile}
                      expandedFolders={expandedFolders}
                      onToggleFolder={toggleFolder}
                    />
                  ))}
                </div>
                <div className="p-4 border-t border-[#3d444d] space-y-2">
                  <button
                    onClick={() => generatePDF('repository')}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg transition-all cursor-pointer font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-[#238636]/50"
                  >
                    <Icons.FileText />
                    <span>Export Entire Repo</span>
                  </button>
                  <button
                    onClick={() => generatePDF('selected')}
                    disabled={loading || selectedFiles.size === 0}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#21262d] hover:bg-[#30363d] hover:border-[#58a6ff] text-white rounded-lg transition-all cursor-pointer font-semibold disabled:opacity-50 disabled:cursor-not-allowed border border-[#3d444d]"
                  >
                    <Icons.FileText />
                    <span>Export Selected ({selectedFiles.size})</span>
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="flex-1 bg-[#0d1117]">
                {currentFile ? (
                  <FileViewer file={currentFile} onClose={() => setCurrentFile(null)} />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#161b22] border border-[#3d444d] flex items-center justify-center text-[#7d8590]">
                        <Icons.Code />
                      </div>
                      <p className="text-white font-medium">Select a file to preview</p>
                      <p className="text-[#7d8590] text-sm mt-1">Click any file in the tree</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#161b22] border border-[#3d444d] flex items-center justify-center text-[#7d8590]">
                  <Icons.GitHub />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Select a Repository</h3>
                <p className="text-[#c9d1d9]">Choose from the sidebar or add a new one</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Settings Modal */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Settings">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#e6edf3] mb-2">GitHub Token</label>
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxx"
              value={newToken}
              onChange={(e) => setNewToken(e.target.value)}
              className="w-full px-4 py-3 bg-[#0d1117] border border-[#2d333b] rounded-lg text-white placeholder-[#484f58] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent transition-all"
            />
          </div>
          <p className="text-sm text-[#8b949e]">
            Required for private repositories. Create a token with <code className="px-1.5 py-0.5 bg-[#2d333b] rounded text-[#f0883e]">repo</code> scope.
          </p>
          {token && (
            <div className="flex items-center gap-2 text-sm text-[#7ee787]">
              <Icons.Check />
              <span>Token is set</span>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 rounded-lg hover:bg-[#2d333b] text-[#8b949e] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={saveToken}
              className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg transition-colors cursor-pointer font-medium"
            >
              Save Token
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Repository Modal */}
      <Modal isOpen={showAddRepo} onClose={() => setShowAddRepo(false)} title="Add Repository">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#e6edf3] mb-2">Repository URL</label>
            <input
              type="text"
              placeholder="https://github.com/user/repo.git"
              value={newRepo.url}
              onChange={(e) => setNewRepo({ ...newRepo, url: e.target.value })}
              className="w-full px-4 py-3 bg-[#0d1117] border border-[#2d333b] rounded-lg text-white placeholder-[#484f58] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#e6edf3] mb-2">Display Name (optional)</label>
            <input
              type="text"
              placeholder="My Project"
              value={newRepo.name}
              onChange={(e) => setNewRepo({ ...newRepo, name: e.target.value })}
              className="w-full px-4 py-3 bg-[#0d1117] border border-[#2d333b] rounded-lg text-white placeholder-[#484f58] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent transition-all"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer group">
            <button
              type="button"
              onClick={() => setNewRepo({ ...newRepo, isPrivate: !newRepo.isPrivate })}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-150 cursor-pointer ${
                newRepo.isPrivate ? 'bg-[#238636] border-[#238636] text-white' : 'border-[#484f58] group-hover:border-[#238636]'
              }`}
            >
              {newRepo.isPrivate && <Icons.Check />}
            </button>
            <span className="text-[#e6edf3]">Private Repository</span>
          </label>
          {newRepo.isPrivate && !token && (
            <div className="p-3 bg-[#f0883e]/10 border border-[#f0883e]/30 rounded-lg text-[#f0883e] text-sm">
              Set a GitHub token in settings to access private repositories.
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowAddRepo(false)}
              className="px-4 py-2 rounded-lg hover:bg-[#2d333b] text-[#8b949e] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={addRepository}
              disabled={loading || !newRepo.url}
              className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg transition-colors cursor-pointer font-medium disabled:opacity-50"
            >
              {loading ? 'Cloning...' : 'Add Repository'}
            </button>
          </div>
        </div>
      </Modal>

      {/* PDF Viewer */}
      <PDFViewer 
        pdfId={pdfId} 
        metadata={pdfMetadata} 
        onClose={() => {
          setPdfId(null);
          setPdfMetadata(null);
        }} 
      />

      {/* Exclude Patterns Modal */}
      <Modal isOpen={showExcludeSettings} onClose={() => setShowExcludeSettings(false)} title="PDF除外設定">
        <div className="space-y-4">
          <p className="text-sm text-[#8b949e]">
            PDF生成時に除外するフォルダ/ファイル名を設定します。
          </p>
          <div>
            <label className="block text-sm font-medium text-[#e6edf3] mb-2">除外パターン</label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {excludePatterns.map((pattern, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pattern}
                    onChange={(e) => {
                      const newPatterns = [...excludePatterns];
                      newPatterns[index] = e.target.value;
                      setExcludePatterns(newPatterns);
                    }}
                    className="flex-1 px-3 py-2 bg-[#0d1117] border border-[#2d333b] rounded-lg text-white placeholder-[#484f58] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent transition-all"
                  />
                  <button
                    onClick={() => setExcludePatterns(excludePatterns.filter((_, i) => i !== index))}
                    className="p-2 rounded-lg hover:bg-[#2d333b] text-[#8b949e] hover:text-[#f85149] transition-colors cursor-pointer"
                  >
                    <Icons.Trash />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setExcludePatterns([...excludePatterns, ''])}
              className="mt-2 inline-flex items-center gap-2 px-3 py-2 bg-[#2d333b] hover:bg-[#3d444d] text-[#e6edf3] rounded-lg transition-colors cursor-pointer text-sm"
            >
              <Icons.Plus />
              <span>パターンを追加</span>
            </button>
          </div>
          <div className="p-3 bg-[#1f6feb]/10 border border-[#1f6feb]/30 rounded-lg">
            <p className="text-sm text-[#58a6ff] mb-2 font-medium">デフォルトパターン</p>
            <div className="flex flex-wrap gap-2">
              {['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'venv', 'target'].map(p => (
                <span key={p} className="px-2 py-1 bg-[#0d1117] border border-[#2d333b] rounded text-xs text-[#8b949e]">
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowExcludeSettings(false)}
              className="px-4 py-2 rounded-lg hover:bg-[#2d333b] text-[#8b949e] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={saveExcludePatterns}
              className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg transition-colors cursor-pointer font-medium"
            >
              Save Settings
            </button>
          </div>
        </div>
      </Modal>

      {/* Loading */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#161b22] border border-[#3d444d] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-6 h-6 border-2 border-[#238636] border-t-transparent rounded-full animate-spin" />
              <span className="text-white font-semibold">{progress.message || 'Processing...'}</span>
            </div>
            <div className="space-y-2">
              <div className="w-full bg-[#21262d] rounded-full h-2.5 overflow-hidden border border-[#3d444d]">
                <div 
                  className={`bg-gradient-to-r from-[#238636] to-[#2ea043] h-full transition-all duration-300 ${
                    progress.isIndeterminate ? 'animate-pulse w-1/2' : ''
                  }`}
                  style={!progress.isIndeterminate && progress.total > 0 ? { width: `${(progress.current / progress.total) * 100}%` } : {}}
                />
              </div>
              <p className="text-sm text-[#c9d1d9] text-center font-medium">
                {progress.isIndeterminate || progress.total === 0 
                  ? '処理中...' 
                  : `${progress.current} / ${progress.total} ファイル`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Skipped Files Notification */}
      {skippedFiles.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-[#161b22] border border-[#f0883e]/50 rounded-xl shadow-2xl overflow-hidden">
          <div className="bg-[#f0883e]/10 px-4 py-3 border-b border-[#f0883e]/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#f0883e]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-[#f0883e] font-semibold text-sm">スキップされたファイル ({skippedFiles.length})</span>
            </div>
            <button
              onClick={() => setSkippedFiles([])}
              className="text-[#8b949e] hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto p-4 space-y-2">
            {skippedFiles.map((file, idx) => (
              <div key={idx} className="text-sm">
                <p className="text-[#e6edf3] font-mono text-xs mb-1">{file.path}</p>
                <p className="text-[#8b949e] text-xs">{file.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
