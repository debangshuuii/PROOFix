'use client';

import React, { useState } from 'react';
import {
  UserJourney,
  JourneyStep,
  StepActionType,
  StepSelectorType,
} from '@/lib/types/journey';
import {
  Compass,
  MousePointer,
  Edit3,
  CheckCircle2,
  Clock,
  Camera,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Settings,
  Save,
  Play,
  Layers,
  Sliders,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Shield,
} from 'lucide-react';

interface JourneyEditorProps {
  initialJourney: UserJourney;
  onSave?: (journey: UserJourney) => Promise<void> | void;
  onRun?: (journey: UserJourney) => void;
  readOnly?: boolean;
}

export function JourneyEditor({
  initialJourney,
  onSave,
  onRun,
  readOnly = false,
}: JourneyEditorProps) {
  const [journey, setJourney] = useState<UserJourney>(initialJourney);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    initialJourney.steps[0]?.id || null
  );
  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const selectedStep = journey.steps.find((s) => s.id === selectedStepId);

  // Helper to update a specific step
  const updateStep = (stepId: string, patch: Partial<JourneyStep>) => {
    if (readOnly) return;
    setJourney((prev) => {
      const updatedSteps = prev.steps.map((s) => {
        if (s.id === stepId) {
          return { ...s, ...patch };
        }
        return s;
      });
      return { ...prev, steps: updatedSteps, updatedAt: new Date().toISOString() };
    });
  };

  // Helper to reorder steps
  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (readOnly) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= journey.steps.length) return;

    const newSteps = [...journey.steps];
    const [moved] = newSteps.splice(index, 1);
    newSteps.splice(targetIndex, 0, moved);

    // Re-index contiguous order
    const reindexed = newSteps.map((s, idx) => ({ ...s, order: idx + 1 }));
    setJourney((prev) => ({ ...prev, steps: reindexed, updatedAt: new Date().toISOString() }));
  };

  // Helper to add a new step
  const addStep = (action: StepActionType = 'click') => {
    if (readOnly) return;
    const newId = `stp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newOrder = journey.steps.length + 1;

    let defaultTitle = 'New Step';
    let target = undefined;
    let params = undefined;

    switch (action) {
      case 'navigate':
        defaultTitle = 'Navigate to Page';
        params = { url: '/' };
        break;
      case 'click':
        defaultTitle = 'Click Button or Link';
        target = { type: 'role_name' as StepSelectorType, role: 'button', name: 'Submit', value: 'Submit' };
        break;
      case 'fill':
        defaultTitle = 'Fill Text Input';
        target = { type: 'label' as StepSelectorType, value: 'Username' };
        params = { value: 'testuser' };
        break;
      case 'assert_visible':
        defaultTitle = 'Assert Element Visible';
        target = { type: 'role_name' as StepSelectorType, role: 'heading', name: 'Welcome', value: 'Welcome' };
        break;
      case 'wait_for_timeout':
        defaultTitle = 'Wait Bounded Duration';
        params = { durationMs: 1000 };
        break;
      case 'take_screenshot':
        defaultTitle = 'Capture Step Screenshot';
        params = { screenshotName: `step_${newOrder}_view` };
        break;
    }

    const newStep: JourneyStep = {
      id: newId,
      order: newOrder,
      title: defaultTitle,
      action,
      target,
      params,
      optional: false,
    };

    setJourney((prev) => ({
      ...prev,
      steps: [...prev.steps, newStep],
      updatedAt: new Date().toISOString(),
    }));
    setSelectedStepId(newId);
  };

  // Helper to duplicate step
  const duplicateStep = (index: number) => {
    if (readOnly) return;
    const original = journey.steps[index];
    const clone: JourneyStep = {
      ...JSON.parse(JSON.stringify(original)),
      id: `stp_${Date.now()}_clone`,
      title: `${original.title} (Copy)`,
    };

    const newSteps = [...journey.steps];
    newSteps.splice(index + 1, 0, clone);
    const reindexed = newSteps.map((s, idx) => ({ ...s, order: idx + 1 }));

    setJourney((prev) => ({ ...prev, steps: reindexed, updatedAt: new Date().toISOString() }));
    setSelectedStepId(clone.id);
  };

  // Helper to delete step
  const deleteStep = (index: number) => {
    if (readOnly) return;
    const newSteps = journey.steps.filter((_, idx) => idx !== index);
    const reindexed = newSteps.map((s, idx) => ({ ...s, order: idx + 1 }));
    setJourney((prev) => ({ ...prev, steps: reindexed, updatedAt: new Date().toISOString() }));

    if (selectedStepId === journey.steps[index]?.id) {
      setSelectedStepId(reindexed[0]?.id || null);
    }
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSave(journey);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const getActionIcon = (action: StepActionType) => {
    switch (action) {
      case 'navigate':
        return <Compass className="w-4 h-4 text-sky-400" />;
      case 'click':
      case 'hover':
      case 'press_key':
        return <MousePointer className="w-4 h-4 text-indigo-400" />;
      case 'fill':
      case 'select_option':
        return <Edit3 className="w-4 h-4 text-emerald-400" />;
      case 'assert_visible':
      case 'assert_text':
      case 'assert_url':
      case 'assert_form_value':
      case 'assert_not_visible':
        return <CheckCircle2 className="w-4 h-4 text-purple-400" />;
      case 'wait_for_timeout':
      case 'wait_for_selector':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'take_screenshot':
        return <Camera className="w-4 h-4 text-pink-400" />;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-950 text-slate-100">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-800/60">
            <Layers className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                disabled={readOnly}
                value={journey.title}
                onChange={(e) => setJourney((p) => ({ ...p, title: e.target.value }))}
                className="bg-transparent text-base font-bold text-slate-100 focus:outline-none focus:border-b focus:border-indigo-500 border-b border-transparent px-1 -ml-1 transition-colors"
                placeholder="Journey Title..."
              />
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                v{journey.schemaVersion}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {journey.steps.length} step(s) • Base: {journey.config.baseUrl || 'http://localhost:4173'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>

          {!readOnly && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Journey'}
            </button>
          )}

          {onRun && (
            <button
              onClick={() => onRun(journey)}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-600/30"
            >
              <Play className="w-3.5 h-3.5" />
              Run Journey
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane: Ordered Steps List */}
        <div className="w-1/2 lg:w-3/5 border-r border-slate-800 flex flex-col bg-slate-950/60">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Journey Execution Steps ({journey.steps.length})
            </span>

            {!readOnly && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => addStep('navigate')}
                  className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 border border-slate-700"
                >
                  <Plus className="w-3 h-3 text-sky-400" /> Nav
                </button>
                <button
                  onClick={() => addStep('click')}
                  className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 border border-slate-700"
                >
                  <Plus className="w-3 h-3 text-indigo-400" /> Click
                </button>
                <button
                  onClick={() => addStep('fill')}
                  className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 border border-slate-700"
                >
                  <Plus className="w-3 h-3 text-emerald-400" /> Fill
                </button>
                <button
                  onClick={() => addStep('assert_visible')}
                  className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 border border-slate-700"
                >
                  <Plus className="w-3 h-3 text-purple-400" /> Assert
                </button>
                <button
                  onClick={() => addStep('wait_for_timeout')}
                  className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 border border-slate-700"
                >
                  <Plus className="w-3 h-3 text-amber-400" /> Wait
                </button>
                <button
                  onClick={() => addStep('take_screenshot')}
                  className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 border border-slate-700"
                >
                  <Plus className="w-3 h-3 text-pink-400" /> Shot
                </button>
              </div>
            )}
          </div>

          {/* Steps Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {journey.steps.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No steps yet. Click buttons above to add visual journey actions.
              </div>
            ) : (
              journey.steps.map((step, idx) => {
                const isSelected = step.id === selectedStepId;
                return (
                  <div
                    key={step.id}
                    onClick={() => setSelectedStepId(step.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-slate-900 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center w-6 text-xs font-mono font-bold text-slate-500">
                        {step.order}
                      </div>

                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                        {getActionIcon(step.action)}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-200">
                            {step.title}
                          </span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {step.action}
                          </span>
                          {step.optional && (
                            <span className="text-[9px] uppercase font-semibold px-1 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/60">
                              Optional
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                          {step.action === 'navigate' && (
                            <span>URL: {step.params?.url || '/'}</span>
                          )}
                          {step.target && (
                            <span>
                              Target: {step.target.type} ({step.target.value})
                            </span>
                          )}
                          {step.params?.value !== undefined && (
                            <span>Value: &quot;{step.params.value}&quot;</span>
                          )}
                          {step.params?.expectedText && (
                            <span>Expected: &quot;{step.params.expectedText}&quot;</span>
                          )}
                          {step.params?.durationMs && (
                            <span>Wait: {step.params.durationMs}ms</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!readOnly && (
                      <div
                        className="flex items-center gap-1 opacity-70 hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          disabled={idx === 0}
                          onClick={() => moveStep(idx, 'up')}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 disabled:opacity-30"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === journey.steps.length - 1}
                          onClick={() => moveStep(idx, 'down')}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 disabled:opacity-30"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => duplicateStep(idx)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteStep(idx)}
                          className="p-1 rounded hover:bg-rose-950/80 text-rose-400"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Step Configuration Inspector */}
        <div className="w-1/2 lg:w-2/5 flex flex-col bg-slate-900/40 overflow-y-auto p-6">
          {showSettings ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-100">Journey Settings</h3>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Back to Steps
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Base Application URL</label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={journey.config.baseUrl || ''}
                    onChange={(e) =>
                      setJourney((p) => ({
                        ...p,
                        config: { ...p.config, baseUrl: e.target.value },
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="http://localhost:4173"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Default Timeout (ms)</label>
                  <input
                    type="number"
                    disabled={readOnly}
                    value={journey.config.defaultTimeoutMs || 10000}
                    onChange={(e) =>
                      setJourney((p) => ({
                        ...p,
                        config: { ...p.config, defaultTimeoutMs: Number(e.target.value) },
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={journey.config.stopOnFailure ?? true}
                      onChange={(e) =>
                        setJourney((p) => ({
                          ...p,
                          config: { ...p.config, stopOnFailure: e.target.checked },
                        }))
                      }
                      className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                    />
                    Stop journey execution immediately on first failed step
                  </label>
                </div>
              </div>
            </div>
          ) : selectedStep ? (
            <div className="space-y-5">
              <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-500">
                    Configuring Step #{selectedStep.order}
                  </span>
                  <h3 className="text-sm font-bold text-slate-100">{selectedStep.title}</h3>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                  {getActionIcon(selectedStep.action)}
                </div>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Step Title</label>
                <input
                  type="text"
                  disabled={readOnly}
                  value={selectedStep.title}
                  onChange={(e) => updateStep(selectedStep.id, { title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Action dropdown */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Action Type</label>
                <select
                  disabled={readOnly}
                  value={selectedStep.action}
                  onChange={(e) =>
                    updateStep(selectedStep.id, {
                      action: e.target.value as StepActionType,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <optgroup label="Navigation">
                    <option value="navigate">Navigate to URL</option>
                  </optgroup>
                  <optgroup label="Interaction">
                    <option value="click">Click Element</option>
                    <option value="fill">Fill Input Field</option>
                    <option value="select_option">Select Dropdown Option</option>
                    <option value="hover">Hover over Element</option>
                  </optgroup>
                  <optgroup label="Assertions">
                    <option value="assert_visible">Assert Element Visible</option>
                    <option value="assert_text">Assert Element Text</option>
                    <option value="assert_url">Assert Current URL</option>
                    <option value="assert_not_visible">Assert Element Not Visible</option>
                  </optgroup>
                  <optgroup label="Observability">
                    <option value="wait_for_timeout">Wait (Bounded Delay)</option>
                    <option value="take_screenshot">Take Screenshot</option>
                  </optgroup>
                </select>
              </div>

              {/* Target Selector Configuration */}
              {selectedStep.action !== 'navigate' &&
                selectedStep.action !== 'wait_for_timeout' &&
                selectedStep.action !== 'take_screenshot' &&
                selectedStep.action !== 'assert_url' && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                      <Shield className="w-3.5 h-3.5 text-indigo-400" />
                      Target Element Selector
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Selector Type
                      </label>
                      <select
                        disabled={readOnly}
                        value={selectedStep.target?.type || 'role_name'}
                        onChange={(e) =>
                          updateStep(selectedStep.id, {
                            target: {
                              type: e.target.value as StepSelectorType,
                              value: selectedStep.target?.value || '',
                              role: selectedStep.target?.role,
                              name: selectedStep.target?.name,
                            },
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                      >
                        <option value="role_name">Accessible Role & Name (Recommended)</option>
                        <option value="label">Form Field Label</option>
                        <option value="placeholder">Input Placeholder</option>
                        <option value="text">Exact/Partial Text</option>
                        <option value="testid">data-testid Attribute</option>
                        <option value="css">CSS Selector</option>
                      </select>
                    </div>

                    {selectedStep.target?.type === 'role_name' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Role</label>
                          <select
                            disabled={readOnly}
                            value={selectedStep.target?.role || 'button'}
                            onChange={(e) =>
                              updateStep(selectedStep.id, {
                                target: {
                                  ...selectedStep.target!,
                                  role: e.target.value,
                                },
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                          >
                            <option value="button">button</option>
                            <option value="link">link</option>
                            <option value="heading">heading</option>
                            <option value="textbox">textbox</option>
                            <option value="checkbox">checkbox</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Accessible Name
                          </label>
                          <input
                            type="text"
                            disabled={readOnly}
                            value={selectedStep.target?.name || ''}
                            onChange={(e) =>
                              updateStep(selectedStep.id, {
                                target: {
                                  ...selectedStep.target!,
                                  name: e.target.value,
                                  value: e.target.value,
                                },
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                            placeholder="e.g. Sign In"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Selector Value
                        </label>
                        <input
                          type="text"
                          disabled={readOnly}
                          value={selectedStep.target?.value || ''}
                          onChange={(e) =>
                            updateStep(selectedStep.id, {
                              target: {
                                type: selectedStep.target?.type || 'css',
                                value: e.target.value,
                              },
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                          placeholder="e.g. #submit-btn or 'Email Address'"
                        />
                      </div>
                    )}
                  </div>
                )}

              {/* Action Parameter Inputs */}
              {selectedStep.action === 'navigate' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Target URL Path</label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={selectedStep.params?.url || '/'}
                    onChange={(e) =>
                      updateStep(selectedStep.id, {
                        params: { ...selectedStep.params, url: e.target.value },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    placeholder="/dashboard or /login"
                  />
                </div>
              )}

              {selectedStep.action === 'fill' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Text Value to Enter</label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={selectedStep.params?.value || ''}
                    onChange={(e) =>
                      updateStep(selectedStep.id, {
                        params: { ...selectedStep.params, value: e.target.value },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    placeholder="Enter input text..."
                  />
                </div>
              )}

              {selectedStep.action === 'select_option' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Option to Select</label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={selectedStep.params?.option || ''}
                    onChange={(e) =>
                      updateStep(selectedStep.id, {
                        params: { ...selectedStep.params, option: e.target.value },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    placeholder="Option text or value"
                  />
                </div>
              )}

              {selectedStep.action === 'assert_text' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Expected Text</label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={selectedStep.params?.expectedText || ''}
                      onChange={(e) =>
                        updateStep(selectedStep.id, {
                          params: { ...selectedStep.params, expectedText: e.target.value },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                      placeholder="Welcome to Dashboard"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Match Mode</label>
                    <select
                      disabled={readOnly}
                      value={selectedStep.params?.matchMode || 'exact'}
                      onChange={(e) =>
                        updateStep(selectedStep.id, {
                          params: {
                            ...selectedStep.params,
                            matchMode: e.target.value as 'exact' | 'contains',
                          },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    >
                      <option value="exact">Exact String Match</option>
                      <option value="contains">Substring Contains</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedStep.action === 'assert_url' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Expected URL Pattern</label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={selectedStep.params?.expectedUrl || ''}
                    onChange={(e) =>
                      updateStep(selectedStep.id, {
                        params: { ...selectedStep.params, expectedUrl: e.target.value },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    placeholder="/dashboard"
                  />
                </div>
              )}

              {selectedStep.action === 'wait_for_timeout' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Wait Duration (ms, max 30000ms)
                  </label>
                  <input
                    type="number"
                    max={30000}
                    min={100}
                    disabled={readOnly}
                    value={selectedStep.params?.durationMs || 1000}
                    onChange={(e) =>
                      updateStep(selectedStep.id, {
                        params: {
                          ...selectedStep.params,
                          durationMs: Math.min(30000, Math.max(100, Number(e.target.value))),
                        },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                  />
                </div>
              )}

              {selectedStep.action === 'take_screenshot' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Screenshot Label</label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={selectedStep.params?.screenshotName || ''}
                    onChange={(e) =>
                      updateStep(selectedStep.id, {
                        params: { ...selectedStep.params, screenshotName: e.target.value },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    placeholder="checkout_summary"
                  />
                </div>
              )}

              {/* Step Options */}
              <div className="pt-3 border-t border-slate-800 text-xs">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={Boolean(selectedStep.optional)}
                    onChange={(e) =>
                      updateStep(selectedStep.id, { optional: e.target.checked })
                    }
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                  />
                  Mark as optional step (does not fail journey if step fails)
                </label>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 text-xs">
              Select a step on the left to configure its target element and parameters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
