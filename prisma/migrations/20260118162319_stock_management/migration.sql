-- CreateEnum
CREATE TYPE "CharacteristicType" AS ENUM ('checkbox', 'radio', 'select', 'multiSelect', 'boolean', 'text', 'multiText', 'textarea', 'multiTextArea', 'number', 'float', 'email', 'date', 'dateHour', 'dateRange', 'dateHourRange', 'link', 'file');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LogType" ADD VALUE 'tag_create';
ALTER TYPE "LogType" ADD VALUE 'tag_update';
ALTER TYPE "LogType" ADD VALUE 'tag_delete';
ALTER TYPE "LogType" ADD VALUE 'characteristic_create';
ALTER TYPE "LogType" ADD VALUE 'characteristic_update';
ALTER TYPE "LogType" ADD VALUE 'characteristic_delete';
ALTER TYPE "LogType" ADD VALUE 'material_create';
ALTER TYPE "LogType" ADD VALUE 'material_update';

-- CreateTable
CREATE TABLE "tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fontColor" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityId" TEXT NOT NULL,

    CONSTRAINT "tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characteristic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "options" JSONB,
    "type" "CharacteristicType" NOT NULL,
    "units" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "entityId" TEXT NOT NULL,

    CONSTRAINT "characteristic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "order_Material_Characteristic" TEXT[],
    "deletedAt" TIMESTAMP(3),
    "entityId" TEXT NOT NULL,

    CONSTRAINT "material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_characteristic" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "characteristicId" TEXT NOT NULL,
    "value" JSONB,

    CONSTRAINT "material_characteristic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_history" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "Characteristics" JSONB NOT NULL DEFAULT '[]',
    "Tags" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filedb" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "materialCharacteristicId" TEXT,

    CONSTRAINT "filedb_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CharacteristicToMaterial" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CharacteristicToMaterial_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MaterialToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MaterialToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "tag_entityId_idx" ON "tag"("entityId");

-- CreateIndex
CREATE INDEX "tag_name_idx" ON "tag"("name");

-- CreateIndex
CREATE INDEX "characteristic_entityId_idx" ON "characteristic"("entityId");

-- CreateIndex
CREATE INDEX "characteristic_deletedAt_idx" ON "characteristic"("deletedAt");

-- CreateIndex
CREATE INDEX "characteristic_entityId_deletedAt_idx" ON "characteristic"("entityId", "deletedAt");

-- CreateIndex
CREATE INDEX "characteristic_name_idx" ON "characteristic"("name");

-- CreateIndex
CREATE INDEX "material_entityId_idx" ON "material"("entityId");

-- CreateIndex
CREATE INDEX "material_deletedAt_idx" ON "material"("deletedAt");

-- CreateIndex
CREATE INDEX "material_entityId_deletedAt_idx" ON "material"("entityId", "deletedAt");

-- CreateIndex
CREATE INDEX "material_name_idx" ON "material"("name");

-- CreateIndex
CREATE INDEX "material_characteristic_materialId_idx" ON "material_characteristic"("materialId");

-- CreateIndex
CREATE INDEX "material_characteristic_characteristicId_idx" ON "material_characteristic"("characteristicId");

-- CreateIndex
CREATE INDEX "material_characteristic_materialId_characteristicId_idx" ON "material_characteristic"("materialId", "characteristicId");

-- CreateIndex
CREATE INDEX "material_history_materialId_idx" ON "material_history"("materialId");

-- CreateIndex
CREATE INDEX "material_history_createdAt_idx" ON "material_history"("createdAt");

-- CreateIndex
CREATE INDEX "material_history_materialId_createdAt_idx" ON "material_history"("materialId", "createdAt");

-- CreateIndex
CREATE INDEX "filedb_materialCharacteristicId_idx" ON "filedb"("materialCharacteristicId");

-- CreateIndex
CREATE INDEX "filedb_createdAt_idx" ON "filedb"("createdAt");

-- CreateIndex
CREATE INDEX "_CharacteristicToMaterial_B_index" ON "_CharacteristicToMaterial"("B");

-- CreateIndex
CREATE INDEX "_MaterialToTag_B_index" ON "_MaterialToTag"("B");

-- AddForeignKey
ALTER TABLE "tag" ADD CONSTRAINT "tag_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characteristic" ADD CONSTRAINT "characteristic_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material" ADD CONSTRAINT "material_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_characteristic" ADD CONSTRAINT "material_characteristic_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_characteristic" ADD CONSTRAINT "material_characteristic_characteristicId_fkey" FOREIGN KEY ("characteristicId") REFERENCES "characteristic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_history" ADD CONSTRAINT "material_history_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filedb" ADD CONSTRAINT "filedb_materialCharacteristicId_fkey" FOREIGN KEY ("materialCharacteristicId") REFERENCES "material_characteristic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CharacteristicToMaterial" ADD CONSTRAINT "_CharacteristicToMaterial_A_fkey" FOREIGN KEY ("A") REFERENCES "characteristic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CharacteristicToMaterial" ADD CONSTRAINT "_CharacteristicToMaterial_B_fkey" FOREIGN KEY ("B") REFERENCES "material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MaterialToTag" ADD CONSTRAINT "_MaterialToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MaterialToTag" ADD CONSTRAINT "_MaterialToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
