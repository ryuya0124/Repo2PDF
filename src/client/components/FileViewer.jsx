import React from 'react';
import { Icons } from './Icons';

export function FileViewer({ file, onClose }) {
  if (!file) return null;
  const lines = file.content.split('\n');

  // 簡易シンタックスハイライト
  const highlightLine = (line, lineIndex) => {
    const ext = file.path.split('.').pop().toLowerCase();
    
    // コメント
    if (line.trim().startsWith('//') || line.trim().startsWith('#') || line.trim().startsWith('<!--')) {
      return <span className="text-[#5c6370] italic">{line}</span>;
    }
    
    // 文字列（シンプルな検出）
    const stringRegex = /(".*?"|'.*?'|`.*?`)/g;
    const keywordRegex = /\b(function|const|let|var|if|else|return|import|export|from|class|extends|async|await|for|while|switch|case|break|continue|try|catch|finally|throw|new|this|super|static|public|private|protected|interface|type|enum|namespace)\b/g;
    const numberRegex = /\b(\d+\.?\d*)\b/g;
    
    let highlighted = line;
    const parts = [];
    let lastIndex = 0;
    
    // 正規表現でマッチング
    const matches = [];
    let match;
    
    // 文字列をマッチング
    while ((match = stringRegex.exec(line)) !== null) {
      matches.push({ index: match.index, length: match[0].length, type: 'string', text: match[0] });
    }
    
    // キーワードをマッチング
    stringRegex.lastIndex = 0;
    while ((match = keywordRegex.exec(line)) !== null) {
      matches.push({ index: match.index, length: match[0].length, type: 'keyword', text: match[0] });
    }
    
    // 数値をマッチング
    keywordRegex.lastIndex = 0;
    while ((match = numberRegex.exec(line)) !== null) {
      matches.push({ index: match.index, length: match[0].length, type: 'number', text: match[0] });
    }
    
    // ソートして重複を除去
    matches.sort((a, b) => a.index - b.index);
    const uniqueMatches = [];
    for (let i = 0; i < matches.length; i++) {
      if (i === 0 || matches[i].index >= uniqueMatches[uniqueMatches.length - 1].index + uniqueMatches[uniqueMatches.length - 1].length) {
        uniqueMatches.push(matches[i]);
      }
    }
    
    // パーツを組み立て
    uniqueMatches.forEach((m, i) => {
      if (m.index > lastIndex) {
        parts.push(<span key={`text-${i}`} className="text-[#e6edf3]">{line.substring(lastIndex, m.index)}</span>);
      }
      
      const colorClass = {
        string: 'text-[#98c379]',
        keyword: 'text-[#c678dd]',
        number: 'text-[#d19a66]'
      }[m.type] || 'text-[#e6edf3]';
      
      parts.push(<span key={`match-${i}`} className={colorClass}>{m.text}</span>);
      lastIndex = m.index + m.length;
    });
    
    if (lastIndex < line.length) {
      parts.push(<span key="end" className="text-[#e6edf3]">{line.substring(lastIndex)}</span>);
    }
    
    return parts.length > 0 ? parts : <span className="text-[#e6edf3]">{line}</span>;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center gap-3">
          <span className="text-[#7ee787]"><Icons.Code /></span>
          <span className="font-mono text-sm text-[#e6edf3]">{file.path}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#8b949e] text-xs">{new Date(file.modified).toLocaleString('ja-JP')}</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#30363d] transition-colors cursor-pointer text-[#8b949e] hover:text-[#e6edf3]">
            <Icons.X />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-[#0d1117]">
        <pre className="font-mono text-sm">
          {lines.map((line, i) => (
            <div key={i} className="flex hover:bg-[#161b22] transition-colors">
              <span className="w-14 text-right pr-4 text-[#8b949e] select-none border-r border-[#30363d] bg-[#0d1117] sticky left-0">{i + 1}</span>
              <code className="pl-4 whitespace-pre flex-1">{highlightLine(line || ' ', i)}</code>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
