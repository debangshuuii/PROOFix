'use client';

/**
 * Enterprise Streaming Virtualized Terminal
 *
 * Master interactive log viewer providing ANSI color support,
 * log-level filtering (ALL, ERROR, WARN, INFO, DEBUG), regex search,
 * virtualized DOM windowing, and auto-scroll lock.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { LogLevel, StreamingTerminalProps, TerminalLine } from '@/lib/types/terminal';
import { RingBufferStream } from '@/lib/terminal/ring-buffer-stream';
import { VirtualWindow } from '@/lib/terminal/virtual-window';
import { LogSearchMatcher } from '@/lib/terminal/search-matcher';
import { TerminalHeader } from './TerminalHeader';
import { TerminalToolbar } from './TerminalToolbar';
import { TerminalSearchInput } from './TerminalSearchInput';
import { AutoScrollLockButton } from './AutoScrollLockButton';
import { VirtualizedTerminalRow } from './VirtualizedTerminalRow';

export function StreamingTerminal({
  logs = [],
  runId,
  isRunning = false,
  maxBufferLines = 10000,
  initialLogLevel = 'ALL',
  className = '',
}: StreamingTerminalProps) {
  const [logLevel, setLogLevel] = useState<LogLevel>(initialLogLevel);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRegex, setIsRegex] = useState<boolean>(false);
  const [caseSensitive, setCaseSensitive] = useState<boolean>(false);
  const [isAutoScrollLocked, setIsAutoScrollLocked] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [viewportHeight, setViewportHeight] = useState<number>(500);

  // Ingest logs into ring buffer
  const stream = useMemo(() => {
    const s = new RingBufferStream(maxBufferLines);
    s.pushBatch(logs);
    return s;
  }, [logs, maxBufferLines]);

  const counts = useMemo(() => stream.getCounts(), [stream]);

  // Apply log level filtering
  const levelFilteredLines = useMemo(() => {
    return stream.getLinesByLevel(logLevel);
  }, [stream, logLevel]);

  // Apply search filtering
  const { matchedLines: displayedLines, matchCount } = useMemo(() => {
    return LogSearchMatcher.filter(levelFilteredLines, searchQuery, isRegex, caseSensitive);
  }, [levelFilteredLines, searchQuery, isRegex, caseSensitive]);

  // Virtual window metrics
  const virtualMetrics = useMemo(() => {
    return VirtualWindow.calculate(
      scrollTop,
      viewportHeight,
      displayedLines.length,
      VirtualWindow.DEFAULT_LINE_HEIGHT_PX
    );
  }, [scrollTop, viewportHeight, displayedLines.length]);

  // Visible rows slice
  const visibleLines = useMemo(() => {
    return displayedLines.slice(virtualMetrics.startIndex, virtualMetrics.endIndex);
  }, [displayedLines, virtualMetrics.startIndex, virtualMetrics.endIndex]);

  // Measure viewport on mount and resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setViewportHeight(containerRef.current.clientHeight || 500);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Handle scroll event & user-initiated unpinning
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop: currentScrollTop, scrollHeight, clientHeight } = containerRef.current;
    setScrollTop(currentScrollTop);

    // If user scrolled up significantly from bottom (> 60px), unlock auto-scroll
    const distanceFromBottom = scrollHeight - (currentScrollTop + clientHeight);
    if (distanceFromBottom > 60 && isAutoScrollLocked) {
      setIsAutoScrollLocked(false);
    } else if (distanceFromBottom <= 10 && !isAutoScrollLocked && isRunning) {
      setIsAutoScrollLocked(true);
    }
  }, [isAutoScrollLocked, isRunning]);

  // Auto-scroll to bottom on new lines if locked
  useEffect(() => {
    if (isAutoScrollLocked && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedLines.length, isAutoScrollLocked]);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      setIsAutoScrollLocked(true);
    }
  };

  const handleCopyLogs = () => {
    const textToCopy = displayedLines.map((l) => l.rawText).join('\n');
    navigator.clipboard?.writeText(textToCopy);
  };

  const handleDownloadLogs = () => {
    const textToDownload = displayedLines.map((l) => l.rawText).join('\n');
    const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `run-${runId.slice(0, 8)}-logs.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalHeight = VirtualWindow.getTotalHeightPx(displayedLines.length);

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl flex flex-col font-mono ${className}`}
    >
      {/* Header */}
      <TerminalHeader
        runId={runId}
        totalLines={stream.totalLines}
        filteredCount={displayedLines.length}
        isRunning={isRunning}
        onCopyLogs={handleCopyLogs}
        onDownloadLogs={handleDownloadLogs}
      />

      {/* Toolbar */}
      <TerminalToolbar currentLevel={logLevel} onSelectLevel={setLogLevel} counts={counts}>
        <TerminalSearchInput
          query={searchQuery}
          onChangeQuery={setSearchQuery}
          isRegex={isRegex}
          onToggleRegex={() => setIsRegex((prev) => !prev)}
          caseSensitive={caseSensitive}
          onToggleCaseSensitive={() => setCaseSensitive((prev) => !prev)}
          matchCount={searchQuery ? matchCount : undefined}
        />
        <AutoScrollLockButton
          isLocked={isAutoScrollLocked}
          onToggleLock={() => setIsAutoScrollLocked((prev) => !prev)}
          onScrollToBottom={scrollToBottom}
        />
      </TerminalToolbar>

      {/* Virtualized Terminal Viewport */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[520px] overflow-y-auto relative bg-slate-950/90 select-text"
      >
        {displayedLines.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 text-xs">
            {isRunning ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
                <span>Waiting for sandbox stdout / stderr stream...</span>
              </div>
            ) : (
              <span>No logs found matching current filter criteria.</span>
            )}
          </div>
        ) : (
          <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
            <div
              style={{
                transform: `translateY(${virtualMetrics.offsetYPx}px)`,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
              }}
            >
              {visibleLines.map((line) => (
                <VirtualizedTerminalRow
                  key={line.id}
                  line={line}
                  searchQuery={searchQuery}
                  isRegex={isRegex}
                  caseSensitive={caseSensitive}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
