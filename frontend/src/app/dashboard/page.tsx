'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header';
import { StatsOverview } from '../../components/StatsOverview';
import { ScheduledTable } from '../../components/ScheduledTable';
import { SentTable } from '../../components/SentTable';
import { ComposeModal } from '../../components/ComposeModal';
import { SlackModal } from '../../components/SlackModal';
import { authApi, emailApi, searchApi } from '../../lib/api';
import { User, EmailJob, SenderConfig, DashboardStats } from '../../lib/types';
import { Plus, Clock, Send, Sparkles, Filter, Layers } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();

  // State
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [senders, setSenders] = useState<SenderConfig[]>([]);

  // Tables state
  const [scheduledEmails, setScheduledEmails] = useState<EmailJob[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailJob[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState<boolean>(true);
  const [loadingSent, setLoadingSent] = useState<boolean>(true);

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [scheduledPage, setScheduledPage] = useState<number>(1);
  const [scheduledTotal, setScheduledTotal] = useState<number>(0);
  const [sentPage, setSentPage] = useState<number>(1);
  const [sentTotal, setSentTotal] = useState<number>(0);
  const [searchSource, setSearchSource] = useState<'elasticsearch' | 'database' | undefined>(undefined);

  // Modals
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [isSlackOpen, setIsSlackOpen] = useState<boolean>(false);

  // 1. Fetch User Profile
  const fetchUser = useCallback(async () => {
    try {
      const res = await authApi.getMe();
      setUser(res.user);
    } catch {
      // If unauthenticated, redirect to login
      router.push('/login');
    }
  }, [router]);

  // 2. Fetch Stats & Senders
  const fetchStatsAndSenders = useCallback(async () => {
    try {
      const [statsRes, sendersRes] = await Promise.all([
        emailApi.getStats(),
        emailApi.getSenders(),
      ]);
      setStats(statsRes);
      setSenders(sendersRes.senders || []);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  // 3. Fetch Scheduled Emails
  const fetchScheduled = useCallback(async () => {
    setLoadingScheduled(true);
    try {
      if (searchQuery.trim()) {
        const res = await searchApi.search(searchQuery.trim(), 'SCHEDULED');
        const list = (res.emails || []).filter((e: EmailJob) =>
          ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED'].includes(e.status)
        );
        setScheduledEmails(list);
        setScheduledTotal(list.length);
        setSearchSource(res.source);
      } else {
        const res = await emailApi.getScheduled({ page: scheduledPage, limit: 10 });
        setScheduledEmails(res.emails || []);
        setScheduledTotal(res.total || 0);
        setSearchSource(res.source);
      }
    } catch (err) {
      console.error('Error fetching scheduled emails:', err);
    } finally {
      setLoadingScheduled(false);
    }
  }, [searchQuery, scheduledPage]);

  // 4. Fetch Sent Emails
  const fetchSent = useCallback(async () => {
    setLoadingSent(true);
    try {
      if (searchQuery.trim()) {
        const res = await searchApi.search(searchQuery.trim(), 'SENT');
        const list = (res.emails || []).filter((e: EmailJob) =>
          ['SENT', 'FAILED'].includes(e.status)
        );
        setSentEmails(list);
        setSentTotal(list.length);
        setSearchSource(res.source);
      } else {
        const res = await emailApi.getSent({ page: sentPage, limit: 10 });
        setSentEmails(res.emails || []);
        setSentTotal(res.total || 0);
        setSearchSource(res.source);
      }
    } catch (err) {
      console.error('Error fetching sent emails:', err);
    } finally {
      setLoadingSent(false);
    }
  }, [searchQuery, sentPage]);

  // Initial load
  useEffect(() => {
    fetchUser();
    fetchStatsAndSenders();
  }, [fetchUser, fetchStatsAndSenders]);

  // Tab and search dependencies
  useEffect(() => {
    if (activeTab === 'scheduled') {
      fetchScheduled();
    } else {
      fetchSent();
    }
  }, [activeTab, fetchScheduled, fetchSent]);

  // Periodic polling to update queue state & sent logs live
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStatsAndSenders();
      if (activeTab === 'scheduled') {
        fetchScheduled();
      } else {
        fetchSent();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab, fetchStatsAndSenders, fetchScheduled, fetchSent]);

  // Handlers
  const handleLogout = async () => {
    await authApi.logout();
    router.push('/login');
  };

  const handleCancelEmail = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled email?')) return;
    try {
      await emailApi.cancelEmail(id);
      fetchScheduled();
      fetchStatsAndSenders();
    } catch (err: any) {
      alert('Error cancelling email: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleComposeSuccess = () => {
    setActiveTab('scheduled');
    fetchScheduled();
    fetchStatsAndSenders();
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] flex flex-col">
      {/* Top Header */}
      <Header
        user={user}
        onLogout={handleLogout}
        onOpenSlackModal={() => setIsSlackOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Page Title & Primary Compose Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Email Dispatch Console</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                Live Scheduler
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Delayed job management, multi-sender rate limiting, and real-time fake SMTP delivery
            </p>
          </div>

          {/* Primary "Compose New Email" Button matching Figma */}
          <button
            onClick={() => setIsComposeOpen(true)}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Compose New Email</span>
          </button>
        </div>

        {/* Dashboard Statistics Overview Cards */}
        <StatsOverview stats={stats} />

        {/* Section Tabs: Scheduled Emails & Sent Emails */}
        <div className="flex items-center space-x-2 border-b border-gray-800 mb-6">
          <button
            onClick={() => {
              setActiveTab('scheduled');
              setSearchQuery('');
            }}
            className={`flex items-center space-x-2 pb-3 px-3 text-xs font-semibold transition border-b-2 ${
              activeTab === 'scheduled'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Scheduled Emails</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400">
              {stats?.scheduled ?? 0}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('sent');
              setSearchQuery('');
            }}
            className={`flex items-center space-x-2 pb-3 px-3 text-xs font-semibold transition border-b-2 ${
              activeTab === 'sent'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Sent Emails</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
              {stats?.sent ?? 0}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'scheduled' ? (
          <ScheduledTable
            emails={scheduledEmails}
            loading={loadingScheduled}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onCancelEmail={handleCancelEmail}
            onRefresh={fetchScheduled}
            onComposeClick={() => setIsComposeOpen(true)}
            page={scheduledPage}
            total={scheduledTotal}
            limit={10}
            onPageChange={setScheduledPage}
            searchSource={searchSource}
          />
        ) : (
          <SentTable
            emails={sentEmails}
            loading={loadingSent}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={fetchSent}
            onComposeClick={() => setIsComposeOpen(true)}
            page={sentPage}
            total={sentTotal}
            limit={10}
            onPageChange={setSentPage}
            searchSource={searchSource}
          />
        )}
      </main>

      {/* Modals */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={handleComposeSuccess}
        senders={senders}
      />

      <SlackModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
        user={user}
        onStatusChange={fetchUser}
      />
    </div>
  );
}
