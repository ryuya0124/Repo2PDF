import React from 'react';
import { Icons } from './Icons';

export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d]">
          <h2 className="text-lg font-semibold text-[#e6edf3]">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#30363d] transition-colors cursor-pointer text-[#8b949e] hover:text-[#e6edf3]">
            <Icons.X />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
