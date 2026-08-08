-- Step 2 creates development reports before payment. Payment later attaches an Order.
ALTER TABLE "Report" ALTER COLUMN "orderId" DROP NOT NULL;
