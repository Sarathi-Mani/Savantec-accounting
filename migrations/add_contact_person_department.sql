-- Add department field to customer contact persons
ALTER TABLE contact_persons
ADD COLUMN IF NOT EXISTS department VARCHAR(100);

