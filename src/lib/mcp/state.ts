export class McpProtocolState {
  private initialized: boolean = false;
  private clientInfo: { name?: string; version?: string } = {};

  public isInitialized(): boolean {
    return this.initialized;
  }

  public handleInitialize(clientInfo?: { name?: string; version?: string }): void {
    if (clientInfo) this.clientInfo = clientInfo;
  }

  public handleInitialized(): void {
    this.initialized = true;
  }

  public getClientInfo(): { name?: string; version?: string } {
    return { ...this.clientInfo };
  }

  public reset(): void {
    this.initialized = false;
    this.clientInfo = {};
  }
}
