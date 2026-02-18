-- Add top-level exchange_rate for purchase invoices
-- Safe for PostgreSQL (uses IF NOT EXISTS)

ALTER TABLE purchases
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(14, 6) DEFAULT 1.0;

UPDATE purchases
SET exchange_rate = 1.0
WHERE exchange_rate IS NULL;
