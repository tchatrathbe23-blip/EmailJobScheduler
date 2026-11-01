'use client';

import React from 'react';
import { EmailJob } from '../lib/types';
import { EmptyState } from './EmptyState';
import { format } from 'date-fns';
import { Search, Clock, Trash2, ShieldAlert, RefreshCw, Mail } from 'lucide-react';

interface ScheduledTableProps {
  emails: EmailJob[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCancelEmail: (id: string) => void;
  onRefresh: () => void;
  onComposeClick: () => void;
  page: number;
  total: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  searchSource?: 'elasticsearch' | 'database';
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({
  emails,
  loading,
  searchQuery,
  onSearchChange,
  onCancelEmail,
  onRefresh,
  onComposeClick,
  page,
  total,
  limit,
  onPageChange,
  searchSource,
}) => {
  const totalPages = Math.ceil(total / limit) || 1;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1 animate-pulse" />
            Sending...
          </span>
        );
      case 'RATE_LIMITED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldAlert className="w-3 h-3 mr-1 text-amber-400" />
            Rate Limited (Rescheduled)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Clock className="w-3 h-3 mr-1 text-indigo-400" />
            Scheduled
          </span>
        );
    }
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Table Controls Header */}
      <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B0F17]/30">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search scheduled emails (by lead, subject, sender)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#0B0F17] border border-gray-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Source info & Refresh */}
        <div className="flex items-center space-x-2">
          {searchSource && (
            <span className="text-[11px] text-gray-500 bg-gray-900 px-2 py-1 rounded-md border border-gray-800">
              Search: <span className="text-indigo-400 capitalize">{searchSource}</span>
            </span>
          )}
          <button
            onClick={onRefresh}
            title="Refresh Table"
            className="p-1.5 text-gray-400 hover:text-white bg-[#0B0F17] border border-gray-800 rounded-xl hover:border-gray-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-800 bg-[#0B0F17]/50 text-gray-400 font-medium">
              <th className="py-3 px-4">Recipient Lead</th>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4">Sender</th>
              <th className="py-3 px-4">Scheduled Execution Time</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              // Loading Skeleton Rows
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4"><div className="h-3.5 bg-gray-800 rounded w-36" /></td>
                  <td className="py-4 px-4"><div className="h-3.5 bg-gray-800 rounded w-48" /></td>
                  <td className="py-4 px-4"><div className="h-3.5 bg-gray-800 rounded w-28" /></td>
                  <td className="py-4 px-4"><div className="h-3.5 bg-gray-800 rounded w-32" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-gray-800 rounded-full w-20" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-4 bg-gray-800 rounded w-8 ml-auto" /></td>
                </tr>
              ))
            ) : emails.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8">
                  <EmptyState
                    title="No Scheduled Emails"
                    description={
                      searchQuery
                        ? `No scheduled emails matching "${searchQuery}". Try clearing search.`
                        : "You don't have any emails in the delayed dispatch queue right now."
                    }
                    onAction={onComposeClick}
                    actionLabel="Compose & Schedule Email"
                  />
                </td>
              </tr>
            ) : (
              emails.map((email) => {
                const dateObj = new Date(email.scheduledAt);
                const formattedDate = !isNaN(dateObj.getTime())
                  ? format(dateObj, 'MMM d, yyyy h:mm:ss a')
                  : email.scheduledAt;

                return (
                  <tr key={email.id} className="hover:bg-gray-800/30 transition group">
                    <td className="py-3 px-4 font-medium text-white">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                          <Mail className="w-3 h-3" />
                        </div>
                        <span className="truncate max-w-[200px]" title={email.recipientEmail}>
                          {email.recipientEmail}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-200">
                      <span className="truncate block max-w-[250px]" title={email.subject}>
                        {email.subject}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400 font-mono text-[11px]">
                      {email.senderEmail}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {formattedDate}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(email.status)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onCancelEmail(email.id)}
                        title="Cancel Scheduled Job"
                        className="p-1 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-gray-800 bg-[#0B0F17]/30 flex items-center justify-between text-xs text-gray-400">
          <span>
            Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total jobs)
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded-lg border border-gray-800 hover:border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-2.5 py-1 rounded-lg border border-gray-800 hover:border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
