CREATE TABLE IF NOT EXISTS company_product_units (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    value VARCHAR(100) NOT NULL,
    label VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_company_product_units_company
    ON company_product_units(company_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_product_units_value
    ON company_product_units(company_id, value);
