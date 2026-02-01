/*
  Warnings:

  - You are about to drop the column `version_id` on the `menu_publications` table. All the data in the column will be lost.
  - You are about to drop the column `version_id` on the `option_groups` table. All the data in the column will be lost.
  - You are about to drop the `menu_version_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `menu_version_sections` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `menu_versions` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `menu_id` to the `option_groups` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "menu_publications" DROP CONSTRAINT "menu_publications_version_id_fkey";

-- DropForeignKey
ALTER TABLE "menu_version_items" DROP CONSTRAINT "menu_version_items_item_id_fkey";

-- DropForeignKey
ALTER TABLE "menu_version_items" DROP CONSTRAINT "menu_version_items_version_id_fkey";

-- DropForeignKey
ALTER TABLE "menu_version_sections" DROP CONSTRAINT "menu_version_sections_section_id_fkey";

-- DropForeignKey
ALTER TABLE "menu_version_sections" DROP CONSTRAINT "menu_version_sections_version_id_fkey";

-- DropForeignKey
ALTER TABLE "menu_versions" DROP CONSTRAINT "menu_versions_created_by_fkey";

-- DropForeignKey
ALTER TABLE "menu_versions" DROP CONSTRAINT "menu_versions_menu_id_fkey";

-- DropForeignKey
ALTER TABLE "option_groups" DROP CONSTRAINT "option_groups_version_id_fkey";

-- AlterTable
ALTER TABLE "menu_publications" DROP COLUMN "version_id";

-- AlterTable
ALTER TABLE "menus" ADD COLUMN     "archived_at" TIMESTAMPTZ,
ADD COLUMN     "published_at" TIMESTAMPTZ,
ADD COLUMN     "status" VARCHAR(20) NOT NULL DEFAULT 'draft';

-- AlterTable
ALTER TABLE "option_groups" DROP COLUMN "version_id",
ADD COLUMN     "menu_id" UUID NOT NULL;

-- DropTable
DROP TABLE "menu_version_items";

-- DropTable
DROP TABLE "menu_version_sections";

-- DropTable
DROP TABLE "menu_versions";

-- CreateTable
CREATE TABLE "menu_lines" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "menu_id" UUID NOT NULL,
    "line_type" VARCHAR(20) NOT NULL,
    "section_id" UUID,
    "item_id" UUID,
    "parent_line_id" UUID,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "menu_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_sections" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "menu_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "menu_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "menu_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "menu_lines_tenant_id_menu_id_idx" ON "menu_lines"("tenant_id", "menu_id");

-- CreateIndex
CREATE INDEX "menu_lines_tenant_id_menu_id_parent_line_id_idx" ON "menu_lines"("tenant_id", "menu_id", "parent_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_line_section_unique" ON "menu_lines"("tenant_id", "menu_id", "section_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_line_item_unique" ON "menu_lines"("tenant_id", "menu_id", "item_id");

-- CreateIndex
CREATE INDEX "menu_sections_tenant_id_menu_id_idx" ON "menu_sections"("tenant_id", "menu_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_sections_tenant_id_menu_id_section_id_key" ON "menu_sections"("tenant_id", "menu_id", "section_id");

-- CreateIndex
CREATE INDEX "menu_items_tenant_id_menu_id_section_id_idx" ON "menu_items"("tenant_id", "menu_id", "section_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_items_tenant_id_menu_id_item_id_key" ON "menu_items"("tenant_id", "menu_id", "item_id");

-- CreateIndex
CREATE INDEX "menus_tenant_id_status_idx" ON "menus"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "menu_publications" ADD CONSTRAINT "menu_publications_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_lines" ADD CONSTRAINT "menu_lines_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_lines" ADD CONSTRAINT "menu_lines_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_lines" ADD CONSTRAINT "menu_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_lines" ADD CONSTRAINT "menu_lines_parent_line_id_fkey" FOREIGN KEY ("parent_line_id") REFERENCES "menu_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_sections" ADD CONSTRAINT "menu_sections_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_sections" ADD CONSTRAINT "menu_sections_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_groups" ADD CONSTRAINT "option_groups_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
