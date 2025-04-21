-- Migration script to update products table schema

-- Drop the old price column if it exists
ALTER TABLE products DROP COLUMN IF EXISTS price;

-- Add retail_price column if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='products' AND column_name='retail_price'
    ) THEN
        ALTER TABLE products ADD COLUMN retail_price NUMERIC(10,2) NOT NULL DEFAULT 0;
    END IF;
END
$$;

-- Add wholesale_price column if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='products' AND column_name='wholesale_price'
    ) THEN
        ALTER TABLE products ADD COLUMN wholesale_price NUMERIC(10,2) NOT NULL DEFAULT 0;
    END IF;
END
$$;
