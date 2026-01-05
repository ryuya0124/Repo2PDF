// 拡張子から言語へのマッピング
export const languageMap = {
  // JavaScript / TypeScript
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  
  // Web
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  '.vue': 'xml',  // highlight.jsはvueを直接サポートしていないためxmlとして扱う
  '.svelte': 'xml',  // svelteもxmlとして扱う
  
  // Python
  '.py': 'python',
  '.pyw': 'python',
  '.pyi': 'python',
  
  // Backend
  '.rb': 'ruby',
  '.go': 'go',
  '.java': 'java',
  '.kt': 'kotlin',
  '.scala': 'scala',
  '.php': 'php',
  '.pl': 'perl',
  
  // C-family
  '.c': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.h': 'cpp',
  '.hpp': 'cpp',
  '.hxx': 'cpp',
  '.cs': 'csharp',
  '.fs': 'fsharp',
  
  // Modern
  '.rs': 'rust',
  '.swift': 'swift',
  '.dart': 'dart',
  '.zig': 'zig',
  
  // Shell
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.fish': 'fish',
  '.ps1': 'powershell',
  '.psm1': 'powershell',
  
  // Config / Data
  '.json': 'json',
  '.jsonc': 'json',
  '.json5': 'json5',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.ini': 'ini',
  '.cfg': 'ini',
  '.conf': 'nginx',
  '.editorconfig': 'ini',
  '.xml': 'xml',
  
  // Markdown / Docs
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.txt': 'plaintext',
  '.rst': 'restructuredtext',
  '.csv': 'plaintext',
  '.svg': 'xml',
  
  // Database
  '.sql': 'sql',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  
  // DevOps
  '.dockerfile': 'dockerfile',
  '.docker': 'dockerfile',
  '.tf': 'hcl',
  '.hcl': 'hcl',
  '.proto': 'protobuf',
  '.nginx': 'nginx',
  
  // Functional
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.erl': 'erlang',
  '.hs': 'haskell',
  '.ml': 'ocaml',
  '.clj': 'clojure',
  '.cljs': 'clojure',
  
  // Other
  '.lua': 'lua',
  '.r': 'r',
  '.R': 'r',
  '.groovy': 'groovy',
  '.gradle': 'groovy',
  '.cmake': 'cmake',
  '.makefile': 'makefile',
  '.mk': 'makefile',
};

// 特殊なファイル名のマッピング
export const specialFileNames = {
  'dockerfile': 'dockerfile',
  'makefile': 'makefile',
  '.gitignore': 'plaintext',
  '.gitattributes': 'plaintext',
  '.editorconfig': 'ini',
  '.npmrc': 'ini',
  '.nvmrc': 'plaintext',
  '.prettierrc': 'json',
  '.prettierignore': 'plaintext',
  '.eslintrc': 'json',
  'pre-commit': 'bash',
  'tsconfig.json': 'jsonc',
  'package.json': 'json',
  'package-lock.json': 'json',
  'pnpm-lock.yaml': 'yaml',
  'yarn.lock': 'yaml',
  'composer.lock': 'json',
  'cargo.toml': 'toml',
  'cargo.lock': 'toml',
  'license': 'plaintext',
  'license.md': 'markdown',
  'license.txt': 'plaintext',
  '_redirects': 'plaintext',
  '_headers': 'plaintext',
  'cname': 'plaintext',
  'readme': 'markdown',
  'readme.md': 'markdown',
  'changelog': 'markdown',
  'changelog.md': 'markdown',
  'contributing': 'markdown',
  'contributing.md': 'markdown',
  'code_of_conduct': 'markdown',
  'code_of_conduct.md': 'markdown',
};

// バイナリファイル拡張子（スキップ対象）
export const binaryExtensions = new Set([
  // 画像
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.avif',
  '.tiff', '.tif', '.psd', '.ai', '.eps', '.heic', '.heif',
  
  // 動画
  '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v',
  
  // 音声
  '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma',
  
  // アーカイブ
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar', '.xz', '.zst',
  
  // バイナリ
  '.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.db', '.sqlite',
  '.wasm', '.jar', '.class', '.pyc', '.pyo',
  
  // ドキュメント
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  
  // フォント
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  
  // その他
  '.lock', '.log', '.cache', '.tmp', '.temp',
  '.webmanifest', '.manifest',
]);

// 言語を検出
export function detectLanguage(filename) {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  const basename = filename.substring(filename.lastIndexOf('/') + 1).toLowerCase();
  
  // 特殊なファイル名をチェック
  if (specialFileNames[basename]) {
    return specialFileNames[basename];
  }
  
  // 拡張子から言語を取得
  return languageMap[ext] || null;
}

// バイナリファイルかチェック
export function isBinaryFile(filename) {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  return binaryExtensions.has(ext);
}

// サポートされている拡張子か確認
export function isSupported(filename) {
  if (isBinaryFile(filename)) return false;
  return detectLanguage(filename) !== null;
}
