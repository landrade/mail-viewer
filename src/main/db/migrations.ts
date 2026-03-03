import { getPool } from './client'

// Inline schema to avoid file-path issues in packaged Electron app
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS accounts (
    id            SERIAL PRIMARY KEY,
    display_name  TEXT        NOT NULL,
    email_address TEXT        NOT NULL UNIQUE,
    imap_host     TEXT        NOT NULL,
    imap_port     INTEGER     NOT NULL DEFAULT 993,
    imap_secure   BOOLEAN     NOT NULL DEFAULT TRUE,
    username      TEXT        NOT NULL,
    password_enc  BYTEA       NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email_address);

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS unseen_count INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_accounts_unseen ON accounts(unseen_count DESC, display_name ASC);
`

export async function runMigrations(): Promise<void> {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query(SCHEMA_SQL)
    console.log('[migrations] Schema applied successfully')
  } finally {
    client.release()
  }
}
