'use client';

/**
 * Mobile Navigation Drawer Component
 *
 * Full-featured slide-out navigation panel for mobile viewports (< 768px).
 * Displays branding, search shortcut, primary and enterprise modules, and theme controls.
 */

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  LayoutDashboard,
  FolderGit2,
  Cpu,
  Shield,
  Layers,
  FileCheck2,
  Settings as SettingsIcon,
  Search,
  BookOpen,
  X,
} from 'lucide-react';
import { ThemeSwitcher } from '../theme/ThemeSwitcher';

interface MobileNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
}

export function MobileNavigationDrawer({
  isOpen,
  onClose,
  onOpenSearch,
}: MobileNavigationDrawerProps) {
  const pathname = usePathname();

  // Close drawer on path change
  useEffect(() => {
    onClose();
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const coreNav = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/projects', label: 'Projects', icon: FolderGit2 },
    { href: '/hub', label: 'Operations Hub', icon: Cpu },
    { href: '/docs', label: 'API Reference', icon: BookOpen },
  ];

  const enterpriseNav = [
    { href: '/sandbox', label: 'Sandbox Isolation', icon: Shield, badge: 'Cgroups' },
    { href: '/queue', label: 'Queues & Sharding', icon: Layers, badge: 'DLQ' },
    { href: '/governance', label: 'SOC2 Governance', icon: FileCheck2, badge: 'Audit' },
    { href: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div
      id="mobile-nav-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation Menu"
      className="fixed inset-0 z-50 md:hidden"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 left-0 w-4/5 max-w-sm bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between">
          <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              PROOF<span className="text-sky-400">ix</span>
              <span className="text-[9px] uppercase font-semibold tracking-wider px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800/50">
                Mobile
              </span>
            </div>
          </Link>

          <button
            onClick={onClose}
            aria-label="Close menu"
            className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar Trigger */}
        <div className="p-3 border-b border-slate-800/60">
          <button
            onClick={() => {
              onClose();
              onOpenSearch();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 text-slate-400 text-xs transition"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-sky-400" />
              <span>Search commands, runs...</span>
            </div>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
              Cmd+K
            </kbd>
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Core Navigation */}
          <div>
            <div className="px-2 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Core Platform
            </div>
            <div className="space-y-1">
              {coreNav.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Enterprise Modules */}
          <div>
            <div className="px-2 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Enterprise Modules
            </div>
            <div className="space-y-1">
              {enterpriseNav.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drawer Footer with Theme Switcher */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            <span className="text-slate-200 font-medium">Appearance</span>
          </div>
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  );
}
