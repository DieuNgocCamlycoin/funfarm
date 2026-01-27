-- Add crypto payment columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS crypto_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS crypto_currency TEXT,
ADD COLUMN IF NOT EXISTS crypto_amount NUMERIC;