/**
 * PROOFix CLI Watch Mode Interactive Keyboard Controller
 * Handles live terminal hotkeys: (r)erun, run (a)ll, (d)octor, (c)lear, (h)elp, (q)uit.
 */

import { colors, symbols } from '../colors.ts';
import { listenKeyPress } from '../prompts.ts';

export interface WatchControllerHandlers {
  onRerun: () => void;
  onRunAll: () => void;
  onDoctor: () => void;
  onClear: () => void;
  onQuit: () => void;
}

export class WatchKeyboardController {
  private cleanupFn?: () => void;

  public attach(handlers: WatchControllerHandlers): void {
    this.cleanupFn = listenKeyPress((char, key) => {
      const lower = (char || key.name || '').toLowerCase();

      switch (lower) {
        case 'r':
          console.log(`\n  ${colors.cyan(symbols.arrow)} Re-running last test journey...`);
          handlers.onRerun();
          break;
        case 'a':
          console.log(`\n  ${colors.cyan(symbols.arrow)} Re-running ALL verification suites...`);
          handlers.onRunAll();
          break;
        case 'd':
          console.log(`\n  ${colors.cyan(symbols.arrow)} Executing environment diagnostics...`);
          handlers.onDoctor();
          break;
        case 'c':
          console.clear();
          handlers.onClear();
          break;
        case 'h':
          this.printHelp();
          break;
        case 'q':
          console.log(`\n  ${colors.gray('Exiting PROOFix watch mode...')}`);
          this.detach();
          handlers.onQuit();
          break;
      }
    });
  }

  public printHelp(): void {
    console.log(`
  ${colors.bold('Watch Mode Keyboard Shortcuts:')}
    ${colors.green('r')} — Re-run last active test journey
    ${colors.green('a')} — Re-run all benchmark scenarios
    ${colors.green('d')} — Run host doctor diagnostics
    ${colors.green('c')} — Clear terminal screen
    ${colors.green('h')} — Show this shortcuts help
    ${colors.red('q')} — Quit watch mode
`);
  }

  public detach(): void {
    if (this.cleanupFn) {
      this.cleanupFn();
      this.cleanupFn = undefined;
    }
  }
}
