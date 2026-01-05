import React, { useState } from 'react';
import { Icons } from './Icons';
import * as api from '../api/client';

export function TreeItem({ item, repoId, depth = 0, selectedFiles, onToggleSelect, onFileClick, expandedFolders, onToggleFolder }) {
  const isExpanded = expandedFolders.has(item.path);
  const isSelected = selectedFiles.has(item.path);
  const [children, setChildren] = useState([]);

  const toggleFolder = async () => {
    onToggleFolder(item.path);
    if (!isExpanded && children.length === 0) {
      const data = await api.get(`/repositories/${repoId}/tree?path=${encodeURIComponent(item.path)}`);
      setChildren(data);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group ${
          isSelected ? 'bg-[#238636]/20 border border-[#238636]/50 shadow-sm' : 'hover:bg-[#161b22] border border-transparent hover:border-[#3d444d]'
        }`}
        style={{ marginLeft: `${depth * 16}px` }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(item); }}
          className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 cursor-pointer ${
            isSelected ? 'bg-[#238636] border-[#238636] text-white' : 'border-[#7d8590] hover:border-[#238636]'
          }`}
        >
          {isSelected && <Icons.Check />}
        </button>

        {item.type === 'directory' ? (
          <button onClick={toggleFolder} className="flex items-center gap-2 flex-1 text-left cursor-pointer">
            <span className={`text-[#7d8590] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
              <Icons.ChevronRight />
            </span>
            <span className="text-[#f0883e]"><Icons.Folder /></span>
            <span className="text-white font-medium">{item.name}</span>
          </button>
        ) : (
          <button onClick={() => onFileClick(item)} className="flex items-center gap-2 flex-1 text-left cursor-pointer">
            <span className="w-4" />
            <span className="text-[#7ee787]"><Icons.File /></span>
            <span className="text-white">{item.name}</span>
            <span className="text-[#7d8590] text-xs ml-auto opacity-0 group-hover:opacity-100 transition-opacity font-mono">
              {(item.size / 1024).toFixed(1)}KB
            </span>
          </button>
        )}
      </div>

      {item.type === 'directory' && isExpanded && children.map((child) => (
        <TreeItem
          key={child.path}
          item={child}
          repoId={repoId}
          depth={depth + 1}
          selectedFiles={selectedFiles}
          onToggleSelect={onToggleSelect}
          onFileClick={onFileClick}
          expandedFolders={expandedFolders}
          onToggleFolder={onToggleFolder}
        />
      ))}
    </div>
  );
}
