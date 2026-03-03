import { getDb } from './client'

// Inline schema to avoid file-path issues in packaged Electron app
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS accounts (
    id            INTEGER  PRIMARY KEY AUTOINCREMENT,
    display_name  TEXT     NOT NULL,
    email_address TEXT     NOT NULL UNIQUE,
    imap_host     TEXT     NOT NULL,
    imap_port     INTEGER  NOT NULL DEFAULT 993,
    imap_secure   INTEGER  NOT NULL DEFAULT 1,
    username      TEXT     NOT NULL,
    password_enc  BLOB     NOT NULL,
    unseen_count  INTEGER  NOT NULL DEFAULT 0,
    created_at    TEXT     NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT     NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_accounts_email  ON accounts(email_address);
CREATE INDEX IF NOT EXISTS idx_accounts_unseen ON accounts(unseen_count DESC, display_name ASC);
`

export async function runMigrations(): Promise<void> {
  const db = getDb()
  db.exec(SCHEMA_SQL)
  console.log('[migrations] Schema applied successfully')
}
