ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS bank_account_id VARCHAR(36);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_invoices_bank_account_id'
          AND table_name = 'invoices'
    ) THEN
        ALTER TABLE invoices
        ADD CONSTRAINT fk_invoices_bank_account_id
        FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_bank_account_id
ON invoices (bank_account_id);
