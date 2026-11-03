'use client';

import React from 'react';
import { User } from '../lib/types';
import { LogOut, ExternalLink, Bell, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onOpenSlackModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, onOpenSlackModal }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-800 bg-[#0B0F17]/95 backdrop-blur px-6 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-white tracking-tight">ReachInbox</span>
              <span className="text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Outbox Labs
              </span>
            </div>
            <p className="text-xs text-gray-400">Production Email Job Scheduler</p>
          </div>
        </div>

        {/* Action Controls & User Info */}
        <div className="flex items-center space-x-4">
          {/* BullMQ Dashboard Live Link */}
          <a
            href={`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/admin/queues`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white bg-gray-900 border border-gray-800 hover:border-gray-700 transition"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>BullMQ Live Queue</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
          </a>

          {/* Slack Connect Pill */}
          <button
            onClick={onOpenSlackModal}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
              user?.slackConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            {user?.slackConnected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Slack: {user.slackChannel || 'Connected'}</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Connect Slack</span>
              </>
            )}
          </button>

          {/* User Profile Card */}
          {user && (
            <div className="flex items-center space-x-3 pl-2 border-l border-gray-800">
              <div className="relative">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || 'User'}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/30"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-semibold text-white">
                    {user.name ? user.name[0] : user.email[0].toUpperCase()}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0B0F17]" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-gray-200 leading-none">{user.name || 'User'}</p>
                <p className="text-[11px] text-gray-400 truncate max-w-[150px] leading-tight mt-0.5">{user.email}</p>
              </div>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                title="Logout"
                className="p-1.5 text-gray-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
