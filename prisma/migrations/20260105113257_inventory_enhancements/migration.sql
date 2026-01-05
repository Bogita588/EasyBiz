-- CreateEnum
CREATE TYPE "ItemKind" AS ENUM ('PRODUCT', 'SERVICE');

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "category" TEXT,
ADD COLUMN     "kind" "ItemKind" NOT NULL DEFAULT 'PRODUCT',
ADD COLUMN     "preferredSupplierId" TEXT;

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "needBy" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Item_preferredSupplierId_idx" ON "Item"("preferredSupplierId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_preferredSupplierId_fkey" FOREIGN KEY ("preferredSupplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
