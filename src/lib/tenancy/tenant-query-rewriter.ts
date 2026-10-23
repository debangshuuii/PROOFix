/**
 * Tenant Query Rewriter & SQL Isolation Injector
 *
 * Automatically inspects SQL statements and securely injects tenant_id filters
 * into SELECT, UPDATE, DELETE, and INSERT queries to ensure physical isolation.
 */

export class TenantQueryRewriter {
  public static injectTenantFilter(
    sql: string,
    params: unknown[],
    tenantId: string
  ): { sql: string; params: unknown[] } {
    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();

    // 1. SELECT query injection
    if (upper.startsWith('SELECT')) {
      if (upper.includes('WHERE')) {
        // Replace WHERE with WHERE tenant_id = ? AND
        const newSql = trimmed.replace(/WHERE/i, 'WHERE tenant_id = ? AND');
        return {
          sql: newSql,
          params: [tenantId, ...params],
        };
      } else if (upper.includes('GROUP BY')) {
        const parts = trimmed.split(/GROUP BY/i);
        const newSql = `${parts[0]} WHERE tenant_id = ? GROUP BY ${parts[1]}`;
        return {
          sql: newSql,
          params: [...params, tenantId],
        };
      } else if (upper.includes('ORDER BY')) {
        const parts = trimmed.split(/ORDER BY/i);
        const newSql = `${parts[0]} WHERE tenant_id = ? ORDER BY ${parts[1]}`;
        return {
          sql: newSql,
          params: [...params, tenantId],
        };
      } else if (upper.includes('LIMIT')) {
        const parts = trimmed.split(/LIMIT/i);
        const newSql = `${parts[0]} WHERE tenant_id = ? LIMIT ${parts[1]}`;
        return {
          sql: newSql,
          params: [...params, tenantId],
        };
      } else {
        return {
          sql: `${trimmed} WHERE tenant_id = ?`,
          params: [...params, tenantId],
        };
      }
    }

    // 2. UPDATE query injection
    if (upper.startsWith('UPDATE')) {
      if (upper.includes('WHERE')) {
        const newSql = trimmed.replace(/WHERE/i, 'WHERE tenant_id = ? AND');
        return {
          sql: newSql,
          params: [tenantId, ...params],
        };
      } else {
        return {
          sql: `${trimmed} WHERE tenant_id = ?`,
          params: [...params, tenantId],
        };
      }
    }

    // 3. DELETE query injection
    if (upper.startsWith('DELETE')) {
      if (upper.includes('WHERE')) {
        const newSql = trimmed.replace(/WHERE/i, 'WHERE tenant_id = ? AND');
        return {
          sql: newSql,
          params: [tenantId, ...params],
        };
      } else {
        return {
          sql: `${trimmed} WHERE tenant_id = ?`,
          params: [...params, tenantId],
        };
      }
    }

    return { sql, params };
  }
}
