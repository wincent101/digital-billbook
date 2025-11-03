-- Add delivery_status column to pos_transactions table
ALTER TABLE pos_transactions 
ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'pending';

COMMENT ON COLUMN pos_transactions.delivery_status IS 'Delivery status: pending, delivered';

-- Update payment_status to have more descriptive comment
COMMENT ON COLUMN pos_transactions.payment_status IS 'Payment status: pending, paid';