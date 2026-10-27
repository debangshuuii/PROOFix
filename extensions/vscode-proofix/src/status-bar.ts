export interface StatusBarState {
  text: string;
  tooltip: string;
  command: string;
  color?: string;
}

/**
 * Manages the live PROOFix verification status bar item in the VS Code bottom tray.
 */
export class ProofixStatusBarItem {
  private provenCount = 0;
  private failingCount = 0;
  private totalCount = 0;
  private isRunning = false;

  public setRunning(running: boolean): StatusBarState {
    this.isRunning = running;
    return this.render();
  }

  public setCounts(proven: number, failing: number, total: number): StatusBarState {
    this.provenCount = proven;
    this.failingCount = failing;
    this.totalCount = total;
    return this.render();
  }

  public render(): StatusBarState {
    if (this.isRunning) {
      return {
        text: '$(sync~spin) PROOFix: Proving...',
        tooltip: 'PROOFix verification runs are currently executing in shadow sandboxes.',
        command: 'proofix.showPanel',
        color: '#38bdf8',
      };
    }

    if (this.failingCount > 0) {
      return {
        text: `$(alert) PROOFix: ${this.failingCount} Failing`,
        tooltip: `${this.failingCount} route(s) failed verification checks. Click to inspect evidence.`,
        command: 'proofix.showPanel',
        color: '#ef4444',
      };
    }

    if (this.provenCount > 0) {
      return {
        text: `$(shield) PROOFix: ${this.provenCount} Proven`,
        tooltip: `All ${this.provenCount} verified route(s) passed with 100% genuine Playwright evidence.`,
        command: 'proofix.showPanel',
        color: '#10b981',
      };
    }

    return {
      text: '$(shield) PROOFix',
      tooltip: 'PROOFix Verification Engine ready. Open a route file to run journeys.',
      command: 'proofix.showPanel',
    };
  }
}
