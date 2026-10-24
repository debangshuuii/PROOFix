import { NextRequest, NextResponse } from 'next/server';

/**
 * Mock DB interface for demonstration
 */
const mockDb = {
  query: async (sql: string, _params?: any[]) => {
    // Simulated DB query runner
    return { rows: [{ id: 1, username: 'admin', email: 'admin@vault.internal' }] };
  },
};

/**
 * VULNERABILITY: Raw template literal string concatenation without parameterization.
 * Attacker input ' OR 1=1 -- causes full database disclosure (CWE-89).
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';

  // VULNERABLE LINE:
  const query = `SELECT * FROM users WHERE username = '${q}'`;
  const results = await mockDb.query(query);

  return NextResponse.json({ users: results.rows });
}
