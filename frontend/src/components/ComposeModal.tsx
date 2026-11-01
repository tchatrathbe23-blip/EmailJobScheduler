'use client';

import React, { useState, useEffect } from 'react';
import { emailApi } from '../lib/api';
import { SenderConfig } from '../lib/types';
import { X, UploadCloud, Calendar, Clock, AlertCircle, CheckCircle, FileText, Send, Sparkles } from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  senders: SenderConfig[];
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  senders,
}) => {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [senderEmail, setSenderEmail] = useState<string>('');
  const [singleRecipient, setSingleRecipient] = useState<string>('');
  const [bulkEmails, setBulkEmails] = useState<string[]>([]);
  const [duplicatesCount, setDuplicatesCount] = useState<number>(0);
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [delayBetweenSeconds, setDelayBetweenSeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(200);

  const [fileName, setFileName] = useState<string>('');
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Default start time to now + 2 minutes formatted for datetime-local
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 2);
      // Format as YYYY-MM-DDTHH:MM
      const offset = now.getTimezoneOffset() * 60000;
      const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
      setStartTime(localISOTime);

      if (senders.length > 0 && !senderEmail) {
        setSenderEmail(senders[0].email);
        if (senders[0].hourlyLimit) {
          setHourlyLimit(senders[0].hourlyLimit);
        }
      }
    }
  }, [isOpen, senders]);

  if (!isOpen) return null;

  // Handle sender change
  const handleSenderChange = (email: string) => {
    setSenderEmail(email);
    const selected = senders.find((s) => s.email === email);
    if (selected && selected.hourlyLimit) {
      setHourlyLimit(selected.hourlyLimit);
    }
  };

  // Handle CSV/TXT file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsingFile(true);
    setErrorMsg('');

    try {
      const res = await emailApi.uploadCsv(file);
      setBulkEmails(res.emails);
      setDuplicatesCount(res.duplicatesRemoved || 0);
    } catch (err: any) {
      setErrorMsg('Failed to parse file: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsParsingFile(false);
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!senderEmail) {
      setErrorMsg('Please select a sender email');
      return;
    }
    if (!subject.trim()) {
      setErrorMsg('Subject line is required');
      return;
    }
    if (!body.trim()) {
      setErrorMsg('Email body content is required');
      return;
    }
    if (!startTime) {
      setErrorMsg('Please select scheduled dispatch start time');
      return;
    }

    setIsSubmitting(true);
    try {
      const scheduledDate = new Date(startTime).toISOString();

      if (mode === 'single') {
        if (!singleRecipient.trim() || !singleRecipient.includes('@')) {
          setErrorMsg('Please enter a valid recipient email');
          setIsSubmitting(false);
          return;
        }

        await emailApi.scheduleSingle({
          senderEmail,
          recipientEmail: singleRecipient.trim(),
          subject: subject.trim(),
          body: body.trim(),
          scheduledAt: scheduledDate,
          delayBetweenEmails: delayBetweenSeconds * 1000,
          hourlyLimit,
        });
      } else {
        if (bulkEmails.length === 0) {
          setErrorMsg('Please upload a CSV or TXT lead file with valid email addresses');
          setIsSubmitting(false);
          return;
        }

        await emailApi.scheduleBulk({
          senderEmail,
          recipientEmails: bulkEmails,
          subject: subject.trim(),
          body: body.trim(),
          startTime: scheduledDate,
          delayBetweenEmails: delayBetweenSeconds * 1000,
          hourlyLimit,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to schedule email');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111827] border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#0B0F17]/50">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Compose Outreach Email</h2>
              <p className="text-xs text-gray-400">Schedule delayed delivery via BullMQ + Redis Queue</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mode Selector */}
          <div className="flex bg-[#0B0F17] p-1 rounded-xl border border-gray-800 text-xs">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                mode === 'single'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Single Lead
            </button>
            <button
              type="button"
              onClick={() => setMode('bulk')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                mode === 'bulk'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Bulk Lead List (CSV / TXT)
            </button>
          </div>

          {/* Sender Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Send From (Sender Identity)</label>
            <select
              value={senderEmail}
              onChange={(e) => handleSenderChange(e.target.value)}
              className="w-full bg-[#0B0F17] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
            >
              {senders.map((s) => (
                <option key={s.id || s.email} value={s.email}>
                  {s.displayName || s.email} &bull; ({s.email}) &bull; Limit: {s.hourlyLimit}/hr
                </option>
              ))}
            </select>
          </div>

          {/* Recipient Input */}
          {mode === 'single' ? (
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Recipient Email</label>
              <input
                type="email"
                placeholder="lead@company.com"
                value={singleRecipient}
                onChange={(e) => setSingleRecipient(e.target.value)}
                className="w-full bg-[#0B0F17] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Upload Lead CSV or Text File</label>
              <div className="border-2 border-dashed border-gray-800 hover:border-indigo-500/50 bg-[#0B0F17]/50 rounded-xl p-4 text-center transition cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <UploadCloud className="w-8 h-8 text-indigo-400 mx-auto mb-1" />
                <p className="text-xs text-gray-300 font-medium">
                  {fileName ? fileName : 'Click or drag CSV / TXT lead file here'}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">Supports comma-separated emails, one-per-line, or tabular CSVs</p>
              </div>

              {/* Detected summary badge */}
              {isParsingFile && <p className="text-xs text-indigo-400 mt-2">Parsing email addresses...</p>}
              {bulkEmails.length > 0 && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>
                      Detected <strong>{bulkEmails.length}</strong> valid recipient emails
                      {duplicatesCount > 0 && ` (${duplicatesCount} duplicates removed)`}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    Sample: {bulkEmails[0]}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Subject Line */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Subject</label>
            <input
              type="text"
              placeholder="Transforming cold outreach with ReachInbox AI"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-[#0B0F17] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
              required
            />
          </div>

          {/* Body Content */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Email Body</label>
            <textarea
              rows={4}
              placeholder="Hi {{firstName}},&#10;&#10;I came across your profile and was impressed by your work..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-[#0B0F17] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
              required
            />
          </div>

          {/* Scheduling Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Start Time */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Start Time</span>
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-[#0B0F17] border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                required
              />
            </div>

            {/* Delay between emails */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>Delay (Seconds)</span>
              </label>
              <input
                type="number"
                min="0"
                max="300"
                value={delayBetweenSeconds}
                onChange={(e) => setDelayBetweenSeconds(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full bg-[#0B0F17] border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              />
              <span className="text-[10px] text-gray-500">Pacing between sends</span>
            </div>

            {/* Hourly Rate Limit */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Hourly Limit</span>
              </label>
              <input
                type="number"
                min="1"
                max="5000"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full bg-[#0B0F17] border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              />
              <span className="text-[10px] text-gray-500">Max emails / hour</span>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 bg-[#0B0F17]/50">
          <p className="text-[11px] text-gray-500">
            Persistent queue powered by BullMQ & Redis &bull; Rate limits trigger Slack alerts
          </p>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isParsingFile}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Scheduling Jobs...' : 'Schedule Email'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
