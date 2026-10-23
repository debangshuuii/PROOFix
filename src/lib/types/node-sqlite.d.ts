/**
 * Type declarations for Node.js v22/v24 built-in 'node:sqlite'
 */

declare module 'node:sqlite' {
  export interface StatementSync {
    all(...params: unknown[]): unknown[];
    run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
    get(...params: unknown[]): unknown | undefined;
  }

  export class DatabaseSync {
    constructor(location: string, options?: { open?: boolean });
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
