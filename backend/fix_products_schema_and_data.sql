-- Check if "price" column exists and drop it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='products' AND column_name='price'
    ) THEN
        ALTER TABLE products DROP COLUMN price;
    END IF;
END
$$;

-- Update existing products to set retail_price and wholesale_price to 0 if null
UPDATE products
SET retail_price = COALESCE(retail_price, 0),
    wholesale_price = COALESCE(wholesale_price, 0)
WHERE retail_price IS NULL OR wholesale_price IS NULL;
