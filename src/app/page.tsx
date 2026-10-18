'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import {
  ShieldCheck,
  Play,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Code2,
  Cpu,
  Layers,
  Terminal,
  FileSearch,
  Zap,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 border-b border-slate-900">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-sky-500/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[250px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-slate-900 border border-slate-800 text-sky-400 mb-8 shadow-inner">
            <span className="flex h-2 w-2 rounded-full bg-sky-400 animate-ping" />
            <span>AI-Powered Application Verification Platform</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            Your code runs. <br />
            <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
              But does it work?
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            PROOFix runs your application in an isolated sandbox, tests real user journeys with Playwright, captures failures with screenshots, and formulates evidence-based fixes before deployment.
          </p>

          {/* Call to Actions */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 transition-all transform hover:-translate-y-0.5"
            >
              <Zap className="w-4 h-4 fill-current" />
              Verify Your Project
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/projects/proj_fixture_01/runs/run_fixture_baseline"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-sm transition-all"
            >
              <Play className="w-3.5 h-3.5 text-sky-400" />
              Inspect Live Sample Report
            </Link>
          </div>

          {/* Core Principle Callout */}
          <div className="mt-12 inline-block px-4 py-2 rounded-md bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400">
            <strong className="text-slate-200 font-semibold">Core Principle:</strong> Never claim an application works without evidence from actual checks.
          </div>
        </div>
      </section>

      {/* 3-Step Journey Section */}
      <section className="py-20 bg-slate-950/60 border-b border-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Evidence-Based Verification in 3 Steps
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Moving past superficial linter checks to genuine browser execution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 relative hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-sky-950 border border-sky-800/50 flex items-center justify-center text-sky-400 mb-5 font-bold text-sm">
                01
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Connect Your Code</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Import from GitHub or upload an archive. PROOFix inspects your package manager, scripts, entry points, and routes without exposing secrets.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 relative hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-indigo-950 border border-indigo-800/50 flex items-center justify-center text-indigo-400 mb-5 font-bold text-sm">
                02
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Run Real Tests</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Launches your application in a sandboxed process. Genuine Playwright Chromium checks navigation, broken links, 500 API responses, and uncaught exceptions.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 relative hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-800/50 flex items-center justify-center text-emerald-400 mb-5 font-bold text-sm">
                03
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Fix with Evidence</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Inspect screenshots, console errors, and HTTP traces. AI formulates grounded root-cause hypotheses and produces reviewable code patch diffs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Realistic Product Preview Section */}
      <section className="py-20 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <div>
              <span className="text-xs uppercase font-semibold tracking-wider text-sky-400">
                Interactive Verification Preview
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
                Persistent Reports with Real Telemetry
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-md border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Sample Verification Benchmark (Commit a1b2c3d)
            </div>
          </div>

          {/* Interactive Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-2xl">
            {/* Top Toolbar */}
            <div className="border-b border-slate-800 px-5 py-3.5 bg-slate-950/80 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm text-white">PROOFix Testbed Benchmark</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-950/60 border border-rose-800/60 text-rose-400 font-medium">
                  2 Checks Failed
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-medium">
                  3 Passed
                </span>
              </div>
              <Link
                href="/projects/proj_fixture_01/runs/run_fixture_baseline"
                className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
              >
                Open Full Report View &rarr;
              </Link>
            </div>

            {/* Checks list preview */}
            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Observed Playwright Checks
                </div>

                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-medium text-slate-200">Root URL Availability & Readiness Check</div>
                    <div className="text-slate-400 mt-0.5">Responded HTTP 200 within 850ms. Title and DOM verified.</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-medium text-slate-200">Navigation & About Page Flow</div>
                    <div className="text-slate-400 mt-0.5">Route /about loaded without console errors.</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/50 flex items-start gap-3">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-medium text-rose-300">Dead Link Audit: /broken-route</div>
                    <div className="text-rose-400/90 mt-0.5">Navigation target returned HTTP 404 (Not Found).</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/50 flex items-start gap-3">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-medium text-rose-300">Backend API Endpoint: /api/data</div>
                    <div className="text-rose-400/90 mt-0.5">Endpoint crashed with HTTP 500 (ECONNREFUSED 127.0.0.1:5432).</div>
                  </div>
                </div>
              </div>

              {/* AI Diagnoser Box */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Evidence-Based AI Diagnosis Preview
                </div>

                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="font-bold text-rose-400">Diagnosis: Backend API Crash (500)</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">92% Confidence</span>
                  </div>
                  <div className="text-slate-300 mb-2">
                    <strong className="text-slate-200">Observed Fact:</strong> Endpoint /api/data returned HTTP 500 with unhandled database connection failure.
                  </div>
                  <div className="text-slate-400 mb-3">
                    <strong className="text-slate-200">AI Hypothesis:</strong> Missing DATABASE_URL connection in sandbox environment.
                  </div>
                  <div className="font-mono text-[11px] bg-slate-900 p-2.5 rounded border border-slate-800/80 text-slate-300 overflow-x-auto">
                    <div className="text-rose-400">- const client = await pool.connect();</div>
                    <div className="text-emerald-400">+ try {'{'} const client = await pool.connect(); {'}'}</div>
                    <div className="text-emerald-400">+ catch (err) {'{'} return fallbackData(); {'}'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 py-10 bg-slate-950 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span className="font-semibold text-slate-400">PROOFix</span>
            <span>&mdash; Don't just generate code. Prove that it works.</span>
          </div>
          <div>Built for developers, indie hackers, and software teams.</div>
        </div>
      </footer>
    </div>
  );
}
