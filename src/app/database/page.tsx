import React from 'react';
import DatabaseMigrationConsole from '@/components/database/DatabaseMigrationConsole';

export const metadata = {
  title: 'Database Adapters & Migrations | PROOFix',
  description: 'Pluggable PostgreSQL, SQLite, and Turso physical database adapters, schema migrations, and transactional outbox console.',
};

export default function DatabasePage() {
  return <DatabaseMigrationConsole />;
}
