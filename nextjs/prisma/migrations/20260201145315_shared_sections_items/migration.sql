/*
  Warnings:

  - You are about to drop the column `allergen_info` on the `ingredients` table. All the data in the column will be lost.
  - You are about to drop the `categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dish_ingredients` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dishes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "dish_ingredients" DROP CONSTRAINT "dish_ingredients_dish_id_fkey";

-- DropForeignKey
ALTER TABLE "dish_ingredients" DROP CONSTRAINT "dish_ingredients_ingredient_id_fkey";

-- DropForeignKey
ALTER TABLE "dishes" DROP CONSTRAINT "dishes_category_id_fkey";

-- DropForeignKey
ALTER TABLE "dishes" DROP CONSTRAINT "dishes_tenant_id_fkey";

-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN     "display_name" VARCHAR(255);

-- AlterTable
ALTER TABLE "ingredients" DROP COLUMN "allergen_info",
ADD COLUMN     "allergen_code" VARCHAR(50);

-- AlterTable
ALTER TABLE "subscription_plans" ADD COLUMN     "max_locations" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "default_currency" VARCHAR(10) NOT NULL DEFAULT 'EUR',
ADD COLUMN     "default_locale" VARCHAR(10) NOT NULL DEFAULT 'en-US',
ADD COLUMN     "price_tax_policy" VARCHAR(20) NOT NULL DEFAULT 'tax_included',
ADD COLUMN     "status" VARCHAR(20) NOT NULL DEFAULT 'active';

-- DropTable
DROP TABLE "categories";

-- DropTable
DROP TABLE "dish_ingredients";

-- DropTable
DROP TABLE "dishes";

-- CreateTable
CREATE TABLE "tenant_locales" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tenant_locales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "country_code" CHAR(2) NOT NULL DEFAULT 'FR',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Europe/Paris',
    "service_dine_in" BOOLEAN NOT NULL DEFAULT true,
    "service_takeaway" BOOLEAN NOT NULL DEFAULT true,
    "service_delivery" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dining_tables" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "qr_code_value" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "dining_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "currency" VARCHAR(10),
    "price_tax_policy" VARCHAR(20),
    "default_locale" VARCHAR(10),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_i18n" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "menu_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,

    CONSTRAINT "menu_i18n_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_availability_rules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "menu_id" UUID NOT NULL,
    "service_type" VARCHAR(20) NOT NULL DEFAULT 'any',
    "dow_mask" INTEGER NOT NULL,
    "start_time_local" VARCHAR(5) NOT NULL,
    "end_time_local" VARCHAR(5) NOT NULL,
    "start_date_local" DATE,
    "end_date_local" DATE,

    CONSTRAINT "menu_availability_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_versions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "menu_id" UUID NOT NULL,
    "label" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "created_by" UUID,
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_publications" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "menu_id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "goes_live_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retires_at" TIMESTAMPTZ,
    "is_current" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "menu_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_version_sections" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "menu_version_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_i18n" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,

    CONSTRAINT "section_i18n_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "sku" VARCHAR(50),
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "spiciness_level" SMALLINT,
    "calories" INTEGER,
    "image_asset_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_version_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "menu_version_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_i18n" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,

    CONSTRAINT "item_i18n_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_price_base" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "currency" VARCHAR(10) NOT NULL,
    "amount_minor" BIGINT NOT NULL,

    CONSTRAINT "item_price_base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_price_overrides" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "location_id" UUID,
    "service_type" VARCHAR(20) NOT NULL DEFAULT 'any',
    "dow_mask" INTEGER,
    "start_time_local" VARCHAR(5),
    "end_time_local" VARCHAR(5),
    "start_date_local" DATE,
    "end_date_local" DATE,
    "currency" VARCHAR(10),
    "amount_minor" BIGINT NOT NULL,

    CONSTRAINT "item_price_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "option_groups" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "code" VARCHAR(50),
    "selection_mode" VARCHAR(20) NOT NULL,
    "min_select" INTEGER NOT NULL DEFAULT 0,
    "max_select" INTEGER,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "option_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "option_group_i18n" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "option_group_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,

    CONSTRAINT "option_group_i18n_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_option_groups" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "option_group_id" UUID NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "item_option_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "option_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "option_group_id" UUID NOT NULL,
    "code" VARCHAR(50),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "option_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "option_item_i18n" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "option_item_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,

    CONSTRAINT "option_item_i18n_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "option_item_prices" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "option_item_id" UUID NOT NULL,
    "currency" VARCHAR(10) NOT NULL,
    "delta_minor" BIGINT NOT NULL,

    CONSTRAINT "option_item_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allergens" (
    "code" VARCHAR(50) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "allergens_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "allergen_i18n" (
    "id" UUID NOT NULL,
    "allergen_code" VARCHAR(50) NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "allergen_i18n_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_allergens" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "allergen_code" VARCHAR(50) NOT NULL,

    CONSTRAINT "item_allergens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "option_item_allergens" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "option_item_id" UUID NOT NULL,
    "allergen_code" VARCHAR(50) NOT NULL,

    CONSTRAINT "option_item_allergens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dietary_flags" (
    "code" VARCHAR(50) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "dietary_flags_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "dietary_flag_i18n" (
    "id" UUID NOT NULL,
    "dietary_flag_code" VARCHAR(50) NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "dietary_flag_i18n_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_dietary_flags" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "dietary_flag_code" VARCHAR(50) NOT NULL,

    CONSTRAINT "item_dietary_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_ingredients" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "quantity" VARCHAR(50),
    "unit" VARCHAR(50),
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL DEFAULT 'image',
    "storage_url" TEXT NOT NULL,
    "content_type" VARCHAR(100),
    "width_px" INTEGER,
    "height_px" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_locales_tenant_id_locale_key" ON "tenant_locales"("tenant_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "brands_tenant_id_slug_key" ON "brands"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "locations_tenant_id_idx" ON "locations"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_tenant_id_brand_id_name_key" ON "locations"("tenant_id", "brand_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "dining_tables_tenant_id_location_id_label_key" ON "dining_tables"("tenant_id", "location_id", "label");

-- CreateIndex
CREATE UNIQUE INDEX "dining_tables_tenant_id_location_id_qr_code_value_key" ON "dining_tables"("tenant_id", "location_id", "qr_code_value");

-- CreateIndex
CREATE INDEX "menus_tenant_id_idx" ON "menus"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "menus_tenant_id_brand_id_code_key" ON "menus"("tenant_id", "brand_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "menu_i18n_tenant_id_menu_id_locale_key" ON "menu_i18n"("tenant_id", "menu_id", "locale");

-- CreateIndex
CREATE INDEX "menu_versions_tenant_id_menu_id_idx" ON "menu_versions"("tenant_id", "menu_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_publications_tenant_id_location_id_menu_id_key" ON "menu_publications"("tenant_id", "location_id", "menu_id");

-- CreateIndex
CREATE INDEX "sections_tenant_id_idx" ON "sections"("tenant_id");

-- CreateIndex
CREATE INDEX "menu_version_sections_tenant_id_version_id_idx" ON "menu_version_sections"("tenant_id", "version_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_version_sections_tenant_id_version_id_section_id_key" ON "menu_version_sections"("tenant_id", "version_id", "section_id");

-- CreateIndex
CREATE UNIQUE INDEX "section_i18n_tenant_id_section_id_locale_key" ON "section_i18n"("tenant_id", "section_id", "locale");

-- CreateIndex
CREATE INDEX "items_tenant_id_section_id_idx" ON "items"("tenant_id", "section_id");

-- CreateIndex
CREATE INDEX "menu_version_items_tenant_id_version_id_section_id_idx" ON "menu_version_items"("tenant_id", "version_id", "section_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_version_items_tenant_id_version_id_item_id_key" ON "menu_version_items"("tenant_id", "version_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "item_i18n_tenant_id_item_id_locale_key" ON "item_i18n"("tenant_id", "item_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "item_price_base_item_id_key" ON "item_price_base"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "option_group_i18n_tenant_id_option_group_id_locale_key" ON "option_group_i18n"("tenant_id", "option_group_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "item_option_groups_tenant_id_item_id_option_group_id_key" ON "item_option_groups"("tenant_id", "item_id", "option_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "option_item_i18n_tenant_id_option_item_id_locale_key" ON "option_item_i18n"("tenant_id", "option_item_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "option_item_prices_option_item_id_key" ON "option_item_prices"("option_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "allergen_i18n_allergen_code_locale_key" ON "allergen_i18n"("allergen_code", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "item_allergens_tenant_id_item_id_allergen_code_key" ON "item_allergens"("tenant_id", "item_id", "allergen_code");

-- CreateIndex
CREATE UNIQUE INDEX "option_item_allergens_tenant_id_option_item_id_allergen_cod_key" ON "option_item_allergens"("tenant_id", "option_item_id", "allergen_code");

-- CreateIndex
CREATE UNIQUE INDEX "dietary_flag_i18n_dietary_flag_code_locale_key" ON "dietary_flag_i18n"("dietary_flag_code", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "item_dietary_flags_tenant_id_item_id_dietary_flag_code_key" ON "item_dietary_flags"("tenant_id", "item_id", "dietary_flag_code");

-- CreateIndex
CREATE INDEX "item_ingredients_item_id_idx" ON "item_ingredients"("item_id");

-- CreateIndex
CREATE INDEX "item_ingredients_ingredient_id_idx" ON "item_ingredients"("ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "item_ingredients_item_id_ingredient_id_key" ON "item_ingredients"("item_id", "ingredient_id");

-- AddForeignKey
ALTER TABLE "tenant_locales" ADD CONSTRAINT "tenant_locales_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dining_tables" ADD CONSTRAINT "dining_tables_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_i18n" ADD CONSTRAINT "menu_i18n_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_availability_rules" ADD CONSTRAINT "menu_availability_rules_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_versions" ADD CONSTRAINT "menu_versions_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_versions" ADD CONSTRAINT "menu_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_publications" ADD CONSTRAINT "menu_publications_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_publications" ADD CONSTRAINT "menu_publications_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "menu_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_version_sections" ADD CONSTRAINT "menu_version_sections_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "menu_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_version_sections" ADD CONSTRAINT "menu_version_sections_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_i18n" ADD CONSTRAINT "section_i18n_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_image_asset_id_fkey" FOREIGN KEY ("image_asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_version_items" ADD CONSTRAINT "menu_version_items_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "menu_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_version_items" ADD CONSTRAINT "menu_version_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_i18n" ADD CONSTRAINT "item_i18n_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_price_base" ADD CONSTRAINT "item_price_base_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_price_overrides" ADD CONSTRAINT "item_price_overrides_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_groups" ADD CONSTRAINT "option_groups_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "menu_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_group_i18n" ADD CONSTRAINT "option_group_i18n_option_group_id_fkey" FOREIGN KEY ("option_group_id") REFERENCES "option_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_option_groups" ADD CONSTRAINT "item_option_groups_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_option_groups" ADD CONSTRAINT "item_option_groups_option_group_id_fkey" FOREIGN KEY ("option_group_id") REFERENCES "option_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_items" ADD CONSTRAINT "option_items_option_group_id_fkey" FOREIGN KEY ("option_group_id") REFERENCES "option_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_item_i18n" ADD CONSTRAINT "option_item_i18n_option_item_id_fkey" FOREIGN KEY ("option_item_id") REFERENCES "option_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_item_prices" ADD CONSTRAINT "option_item_prices_option_item_id_fkey" FOREIGN KEY ("option_item_id") REFERENCES "option_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergen_i18n" ADD CONSTRAINT "allergen_i18n_allergen_code_fkey" FOREIGN KEY ("allergen_code") REFERENCES "allergens"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_allergens" ADD CONSTRAINT "item_allergens_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_allergens" ADD CONSTRAINT "item_allergens_allergen_code_fkey" FOREIGN KEY ("allergen_code") REFERENCES "allergens"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_item_allergens" ADD CONSTRAINT "option_item_allergens_option_item_id_fkey" FOREIGN KEY ("option_item_id") REFERENCES "option_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_item_allergens" ADD CONSTRAINT "option_item_allergens_allergen_code_fkey" FOREIGN KEY ("allergen_code") REFERENCES "allergens"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dietary_flag_i18n" ADD CONSTRAINT "dietary_flag_i18n_dietary_flag_code_fkey" FOREIGN KEY ("dietary_flag_code") REFERENCES "dietary_flags"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_dietary_flags" ADD CONSTRAINT "item_dietary_flags_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_dietary_flags" ADD CONSTRAINT "item_dietary_flags_dietary_flag_code_fkey" FOREIGN KEY ("dietary_flag_code") REFERENCES "dietary_flags"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_ingredients" ADD CONSTRAINT "item_ingredients_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_ingredients" ADD CONSTRAINT "item_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
