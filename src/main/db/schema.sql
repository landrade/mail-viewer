-- Mail Viewer Database Schema

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
