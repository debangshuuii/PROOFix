'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Shield,
  Send,
  Loader2,
  X,
} from 'lucide-react';
import type {
  ProjectNotificationSettings,
  WebhookChannelConfig,
  NotificationEventType,
  NotificationChannelType,
} from '@/lib/types/notification';

interface WebhookConfigModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  canEdit?: boolean;
}

export const WebhookConfigModal: React.FC<WebhookConfigModalProps> = ({
  projectId,
  isOpen,
  onClose,
  canEdit = true,
}) => {
  const [settings, setSettings] = useState<ProjectNotificationSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Draft state for new/edited channel
  const [newChannelType, setNewChannelType] = useState<NotificationChannelType>('slack');
  const [newChannelName, setNewChannelName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<NotificationEventType[]>([
    'run.failed',
    'regression.detected',
    'security.alert',
  ]);

  useEffect(() => {
    if (isOpen && projectId) {
      loadSettings();
    }
  }, [isOpen, projectId]);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/notifications`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to load settings (status ${res.status})`);
      }
      const data = await res.json();
      setSettings(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEvent = (ev: NotificationEventType) => {
    if (selectedEvents.includes(ev)) {
      setSelectedEvents(selectedEvents.filter((e) => e !== ev));
    } else {
      setSelectedEvents([...selectedEvents, ev]);
    }
  };

  const handleAddChannel = () => {
    if (!newWebhookUrl.trim()) {
      setError('Please provide a webhook URL.');
      return;
    }

    if (selectedEvents.length === 0) {
      setError('Select at least one event type to trigger notifications.');
      return;
    }

    const newChannel: WebhookChannelConfig = {
      id: `ch_${Date.now()}`,
      channelType: newChannelType,
      channelName: newChannelName.trim() || `${newChannelType.toUpperCase()} Alerts`,
      enabled: true,
      hasSecret: true,
      webhookUrlMasked: newWebhookUrl.slice(0, 18) + '••••••••' + newWebhookUrl.slice(-4),
      notifyOnEvents: [...selectedEvents],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSettings((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        channels: [...prev.channels, newChannel],
      };
    });

    setNewChannelName('');
    setNewWebhookUrl('');
    setError(null);
  };

  const handleRemoveChannel = (channelId: string) => {
    setSettings((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        channels: prev.channels.filter((c) => c.id !== channelId),
      };
    });
  };

  const handleSave = async () => {
    if (!settings) return;
    if (!canEdit) {
      setError('You are not authorized to modify notification settings for this project.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Save failed (${res.status})`);
      }

      const updated = await res.json();
      setSettings(updated);
      setSuccessMsg('Notification settings saved securely.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestChannel = async (channelId: string) => {
    setTestingId(channelId);
    setError(null);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/notifications/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Test notification failed');
      }

      setSuccessMsg(data.message || 'Test notification sent successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(`Test failed: ${err.message}`);
    } finally {
      setTestingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Slack & Discord Webhook Alerts</h2>
              <p className="text-xs text-slate-400">
                Receive real-time alerts for verification failures, regressions, and security findings.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <span>Loading notification settings...</span>
          </div>
        ) : settings ? (
          <div className="mt-5 space-y-6">
            {/* Master Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
              <div>
                <span className="text-sm font-medium text-white">Enable Project Webhooks</span>
                <p className="text-xs text-slate-400">
                  When disabled, no webhooks or unsolicited alerts will ever be dispatched.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Severity Preference */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Minimum Severity Filter</label>
              <select
                disabled={!canEdit}
                value={settings.deliveryPreferences.minSeverity}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    deliveryPreferences: {
                      ...settings.deliveryPreferences,
                      minSeverity: e.target.value as any,
                    },
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="failures_only">Failures Only (Failed runs, regressions, security alerts)</option>
                <option value="regressions_only">Regressions & Security Only</option>
                <option value="all">All Events (Includes successful completions)</option>
              </select>
            </div>

            {/* Configured Channels List */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Configured Webhook Channels ({settings.channels.length})
              </h3>
              {settings.channels.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  No webhook channels configured yet. Add a Slack or Discord webhook below.
                </div>
              ) : (
                <div className="space-y-2">
                  {settings.channels.map((ch) => (
                    <div
                      key={ch.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                            {ch.channelType}
                          </span>
                          <span className="text-xs font-semibold text-white">
                            {ch.channelName || 'Webhook'}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400">
                          {ch.webhookUrlMasked || '••••••••••••••••'}
                        </p>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {ch.notifyOnEvents.map((ev) => (
                            <span
                              key={ev}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300"
                            >
                              {ev}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={testingId === ch.id || !canEdit}
                          onClick={() => handleTestChannel(ch.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center gap-1.5 transition disabled:opacity-50"
                        >
                          {testingId === ch.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>Test</span>
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleRemoveChannel(ch.id)}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Channel Form */}
            {canEdit && (
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <span>Add Webhook Channel</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Platform</label>
                    <select
                      value={newChannelType}
                      onChange={(e) => setNewChannelType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="slack">Slack Incoming Webhook</option>
                      <option value="discord">Discord Webhook</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Label (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. #dev-alerts"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Webhook URL</label>
                  <input
                    type="password"
                    placeholder={
                      newChannelType === 'slack'
                        ? 'https://hooks.slack.com/services/...'
                        : 'https://discord.com/api/webhooks/...'
                    }
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1.5">
                    Trigger on Events
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {(
                      [
                        { id: 'run.failed', label: 'Run Failed' },
                        { id: 'regression.detected', label: 'Regression Detected' },
                        { id: 'security.alert', label: 'Security Findings' },
                        { id: 'run.completed', label: 'Run Succeeded' },
                      ] as const
                    ).map((ev) => (
                      <label key={ev.id} className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(ev.id)}
                          onChange={() => handleToggleEvent(ev.id)}
                          className="rounded border-slate-700 text-indigo-600 focus:ring-0 bg-slate-900"
                        />
                        <span>{ev.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddChannel}
                  className="w-full mt-2 py-1.5 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-medium text-white transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Channel</span>
                </button>
              </div>
            )}
          </div>
        ) : null}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Webhook URLs are encrypted at rest with AES-256-GCM and redacted from logs.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            {canEdit && (
              <button
                type="button"
                disabled={saving || loading}
                onClick={handleSave}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Settings</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
