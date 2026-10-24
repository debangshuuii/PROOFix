/**
 * PROOFix CLI Box & Table Formatting Utilities
 * Creates structured terminal borders, boxes, and columnar data displays.
 */

import { stripAnsi, colors } from './colors.ts';

export interface TableColumn {
  header: string;
  key?: string;
  align?: 'left' | 'right' | 'center';
  minWidth?: number;
}

export interface BoxOptions {
  padding?: number;
  borderColor?: (text: string) => string;
  titleColor?: (text: string) => string;
}

export function createBox(title: string, contentLines: string[], options: BoxOptions = {}): string {
  const pad = options.padding ?? 1;
  const colorBorder = options.borderColor ?? colors.cyan;
  const colorTitle = options.titleColor ?? colors.bold;

  const contentLengths = contentLines.map((line) => stripAnsi(line).length);
  const titleLen = stripAnsi(title).length;
  const maxLen = Math.max(titleLen + 4, ...contentLengths, 30);
  const boxWidth = maxLen + pad * 2;

  const topBorder = colorBorder('┌─ ') + colorTitle(title) + ' ' + colorBorder('─'.repeat(Math.max(0, boxWidth - titleLen - 4)) + '┐');
  const bottomBorder = colorBorder('└' + '─'.repeat(boxWidth) + '┘');
  const emptyPadding = colorBorder('│') + ' '.repeat(boxWidth) + colorBorder('│');

  const formattedLines: string[] = [];
  formattedLines.push(topBorder);

  for (let i = 0; i < pad; i++) {
    formattedLines.push(emptyPadding);
  }

  for (const line of contentLines) {
    const rawLen = stripAnsi(line).length;
    const rightPad = Math.max(0, boxWidth - rawLen - pad);
    const formatted =
      colorBorder('│') +
      ' '.repeat(pad) +
      line +
      ' '.repeat(rightPad) +
      colorBorder('│');
    formattedLines.push(formatted);
  }

  for (let i = 0; i < pad; i++) {
    formattedLines.push(emptyPadding);
  }

  formattedLines.push(bottomBorder);
  return formattedLines.join('\n');
}

export function renderTable(columns: TableColumn[], rows: Array<Record<string, string>>): string {
  if (columns.length === 0) return '';

  // Determine widths
  const widths: number[] = columns.map((col, idx) => {
    const headerLen = stripAnsi(col.header).length;
    const colKey = col.key ?? col.header.toLowerCase();
    const cellLens = rows.map((r) => stripAnsi(r[colKey] || '').length);
    const minW = col.minWidth ?? 0;
    return Math.max(headerLen, minW, ...cellLens);
  });

  function padCell(text: string, width: number, align: 'left' | 'right' | 'center' = 'left'): string {
    const visibleLen = stripAnsi(text).length;
    const diff = Math.max(0, width - visibleLen);
    if (align === 'right') return ' '.repeat(diff) + text;
    if (align === 'center') {
      const left = Math.floor(diff / 2);
      const right = diff - left;
      return ' '.repeat(left) + text + ' '.repeat(right);
    }
    return text + ' '.repeat(diff);
  }

  const lines: string[] = [];

  // Header
  const headerCells = columns.map((col, i) =>
    colors.bold(padCell(col.header, widths[i], col.align))
  );
  lines.push('  ' + headerCells.join('   '));

  // Divider
  const dividerCells = widths.map((w) => colors.gray('─'.repeat(w)));
  lines.push('  ' + dividerCells.join('   '));

  // Rows
  for (const row of rows) {
    const rowCells = columns.map((col, i) => {
      const colKey = col.key ?? col.header.toLowerCase();
      const val = row[colKey] || '';
      return padCell(val, widths[i], col.align);
    });
    lines.push('  ' + rowCells.join('   '));
  }

  return lines.join('\n');
}
