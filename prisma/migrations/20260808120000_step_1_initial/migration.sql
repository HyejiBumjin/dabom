-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('READY', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "kakaoId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SajuProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "birthDate" DATE NOT NULL,
    "birthTime" TEXT,
    "isLunar" BOOLEAN NOT NULL DEFAULT false,
    "isLeapMonth" BOOLEAN NOT NULL DEFAULT false,
    "myeongsik" JSONB NOT NULL,
    "teaser" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SajuProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sajuProfileId" TEXT NOT NULL,
    "merchantUid" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'READY',
    "paidAmount" INTEGER,
    "paidAt" TIMESTAMP(3),
    "pgTxId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sajuProfileId" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "content" JSONB,
    "promptVersion" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_kakaoId_key" ON "User"("kakaoId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "SajuProfile_userId_idx" ON "SajuProfile"("userId");
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");
CREATE UNIQUE INDEX "Order_merchantUid_key" ON "Order"("merchantUid");
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_productId_idx" ON "Order"("productId");
CREATE INDEX "Order_sajuProfileId_idx" ON "Order"("sajuProfileId");
CREATE UNIQUE INDEX "Report_orderId_key" ON "Report"("orderId");
CREATE INDEX "Report_status_idx" ON "Report"("status");
CREATE UNIQUE INDEX "Report_sajuProfileId_productCode_key" ON "Report"("sajuProfileId", "productCode");

ALTER TABLE "SajuProfile" ADD CONSTRAINT "SajuProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_sajuProfileId_fkey" FOREIGN KEY ("sajuProfileId") REFERENCES "SajuProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_sajuProfileId_fkey" FOREIGN KEY ("sajuProfileId") REFERENCES "SajuProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
