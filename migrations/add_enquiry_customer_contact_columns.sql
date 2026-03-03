-- Separate customer contact fields from kind-attn contact fields for enquiries
ALTER TABLE enquiries
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);

ALTER TABLE enquiries
ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);

