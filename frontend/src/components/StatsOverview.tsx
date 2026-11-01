'use client';

import React from 'react';
import { DashboardStats } from '../lib/types';
import { Clock, CheckCircle2, ShieldAlert, Users, Layers, Activity } from 'lucide-react';

interface StatsOverviewProps {
  stats: DashboardStats | null;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* Scheduled Card */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-gray-700 transition">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400">Scheduled In Queue</span>
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white tracking-tight">{stats?.scheduled ?? 0}</span>
          <span className="text-xs text-indigo-400 font-medium">pending</span>
        </div>
        <div className="mt-2 flex items-center text-[11px] text-gray-400">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 mr-1.5"></span>
          BullMQ Delayed Jobs
        </div>
      </div>

      {/* Sent Card */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-gray-700 transition">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400">Delivered Emails</span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white tracking-tight">{stats?.sent ?? 0}</span>
          <span className="text-xs text-emerald-400 font-medium">delivered</span>
        </div>
        <div className="mt-2 flex items-center text-[11px] text-gray-400">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>
          Via Ethereal SMTP
        </div>
      </div>

      {/* Rate Limited Card */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-gray-700 transition">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400">Rate Limited & Deferred</span>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white tracking-tight">{stats?.rateLimited ?? 0}</span>
          <span className="text-xs text-amber-400 font-medium">deferred</span>
        </div>
        <div className="mt-2 flex items-center text-[11px] text-gray-400">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5"></span>
          Slack Alerted & Rescheduled
        </div>
      </div>

      {/* Senders & Concurrency */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-gray-700 transition">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400">Senders & Concurrency</span>
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white tracking-tight">{stats?.sendersCount ?? 3}</span>
          <span className="text-xs text-purple-400 font-medium">senders active</span>
        </div>
        <div className="mt-2 flex items-center text-[11px] text-gray-400">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400 mr-1.5"></span>
          Worker Concurrency: 5
        </div>
      </div>
    </div>
  );
};
