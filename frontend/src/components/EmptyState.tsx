'use client';

import React from 'react';
import { Mail, Inbox, PlusCircle } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  onAction?: () => void;
  actionLabel?: string;
  icon?: 'mail' | 'inbox';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  onAction,
  actionLabel,
  icon = 'mail',
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-[#111827]/40 border border-dashed border-gray-800 rounded-xl my-4">
      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
        {icon === 'mail' ? <Mail className="w-6 h-6" /> : <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-semibold text-gray-200">{title}</h3>
      <p className="text-xs text-gray-400 max-w-sm mt-1 mb-4 leading-relaxed">{description}</p>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};
