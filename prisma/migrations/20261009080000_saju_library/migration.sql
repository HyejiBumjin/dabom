CREATE TYPE "ProfileRelationship" AS ENUM ('SELF', 'FAMILY', 'FRIEND', 'PARTNER', 'OTHER');
ALTER TABLE "SajuProfile" ADD COLUMN "relationship" "ProfileRelationship" NOT NULL DEFAULT 'SELF', ADD COLUMN "birthKey" TEXT;
ALTER TABLE "Order" ADD COLUMN "amount" INTEGER;
CREATE UNIQUE INDEX "SajuProfile_userId_birthKey_key" ON "SajuProfile"("userId", "birthKey");
CREATE UNIQUE INDEX "Order_userId_sajuProfileId_productId_key" ON "Order"("userId", "sajuProfileId", "productId");
