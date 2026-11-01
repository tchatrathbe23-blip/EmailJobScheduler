'use client';

import React, { useState } from 'react';
import { slackApi } from '../lib/api';
import { User } from '../lib/types';
import { X, Bell, CheckCircle2, AlertCircle, Send, LogOut, ExternalLink, ShieldCheck } from 'lucide-react';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onStatusChange: () => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  isOpen,
  onClose,
  user,
  onStatusChange,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channelName, setChannelName] = useState('#outreach-alerts');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleOAuthConnect = async () => {
    try {
      const res = await slackApi.getAuthUrl();
      if (!res.configured || !res.url) {
        setFeedback({
          type: 'error',
          message: res.message || 'Slack OAuth is not configured. Please use the Incoming Webhook option below instead.',
        });
        return;
      }
      window.location.href = res.url;
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to start Slack OAuth' });
    }
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      setFeedback({ type: 'error', message: 'Webhook URL must start with https://hooks.slack.com/' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      await slackApi.setWebhook({ webhookUrl, channel: channelName });
      setFeedback({ type: 'success', message: 'Slack incoming webhook connected successfully!' });
      onStatusChange();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestAlert = async () => {
    setIsTesting(true);
    setFeedback(null);
    try {
      const res = await slackApi.testAlert();
      setFeedback({ type: 'success', message: res.message || 'Live Slack alert delivered!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await slackApi.disconnect();
      setFeedback({ type: 'success', message: 'Slack disconnected successfully.' });
      onStatusChange();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111827] border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#0B0F17]/50">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Slack Rate Limit Alerts</h2>
              <p className="text-xs text-gray-400">Live Slack notifications when hourly sender limit is reached</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center space-x-2 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Current Status Box */}
          <div className="p-4 rounded-xl bg-[#0B0F17] border border-gray-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  user?.slackConnected ? 'bg-emerald-500 shadow-md shadow-emerald-500/50' : 'bg-gray-600'
                }`}
              />
              <div>
                <p className="text-xs font-semibold text-gray-200">
                  {user?.slackConnected ? 'Slack is Connected' : 'Slack is Not Connected'}
                </p>
                <p className="text-[11px] text-gray-400">
                  {user?.slackConnected
                    ? `Posting alerts to: ${user.slackChannel || '#outreach-alerts'}`
                    : 'Rate limit hits will run safely without sending notifications'}
                </p>
              </div>
            </div>

            {user?.slackConnected && (
              <button
                onClick={handleDisconnect}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            )}
          </div>

          {/* Option 1: Live OAuth Connect */}
          <div className="pt-2">
            <p className="text-xs font-medium text-gray-300 mb-2">Option 1: Connect via Slack OAuth 2.0</p>
            <button
              onClick={handleOAuthConnect}
              className="w-full py-2.5 px-4 bg-[#4A154B] hover:bg-[#3f1240] text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition shadow-md"
            >
              <span>Add to Slack (OAuth Flow)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center my-2">
            <div className="flex-1 border-t border-gray-800" />
            <span className="px-3 text-[11px] text-gray-500 uppercase tracking-wider">or</span>
            <div className="flex-1 border-t border-gray-800" />
          </div>

          {/* Option 2: Direct Webhook */}
          <form onSubmit={handleSaveWebhook} className="space-y-3">
            <p className="text-xs font-medium text-gray-300">Option 2: Direct Incoming Webhook (Instant)</p>
            <input
              type="url"
              placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full bg-[#0B0F17] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
            />
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="#outreach-alerts"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                className="w-1/2 bg-[#0B0F17] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                type="submit"
                disabled={isSaving || !webhookUrl}
                className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-medium transition"
              >
                {isSaving ? 'Saving...' : 'Save Webhook'}
              </button>
            </div>
          </form>

          {/* Live Verifiable Test Button */}
          {user?.slackConnected && (
            <div className="pt-3 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-200">Test Live Notification</p>
                  <p className="text-[11px] text-gray-400">Trigger a sample rate-limit alert block to verify delivery</p>
                </div>
                <button
                  type="button"
                  onClick={handleTestAlert}
                  disabled={isTesting}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-sm transition disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                  <span>{isTesting ? 'Sending Alert...' : 'Send Live Alert'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-800 bg-[#0B0F17]/50 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
