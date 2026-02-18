/*
  Warnings:

  - The values [support_admin] on the enum `PlatformAdminRole` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[tenant_id,slug]` on the table `locations` will be added. If there are existing duplicate values, this will fail.
  - Made the column `permissions` on table `admin_users` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `slug` to the `locations` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "OrderItemStatus" AS ENUM ('pending', 'preparing', 'ready', 'served', 'cancelled');

-- CreateEnum
CREATE TYPE "TableSessionStatus" AS ENUM ('open', 'bill_requested', 'paid', 'closed');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'refunded');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'card', 'app');

-- AlterEnum
BEGIN;
CREATE TYPE "PlatformAdminRole_new" AS ENUM ('super_admin', 'support_agent', 'billing_manager');
ALTER TABLE "public"."platform_admins" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "platform_admins" ALTER COLUMN "role" TYPE "PlatformAdminRole_new" USING ("role"::text::"PlatformAdminRole_new");
ALTER TYPE "PlatformAdminRole" RENAME TO "PlatformAdminRole_old";
ALTER TYPE "PlatformAdminRole_new" RENAME TO "PlatformAdminRole";
DROP TYPE "public"."PlatformAdminRole_old";
ALTER TABLE "platform_admins" ALTER COLUMN "role" SET DEFAULT 'support_agent';
COMMIT;

-- AlterTable
ALTER TABLE "admin_users" ALTER COLUMN "permissions" SET NOT NULL;

-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "email" VARCHAR(255),
ADD COLUMN     "phone" VARCHAR(30),
ADD COLUMN     "slug" VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE "platform_admins" ADD COLUMN     "deleted_at" TIMESTAMPTZ,
ADD COLUMN     "display_name" VARCHAR(255),
ADD COLUMN     "permissions" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "role" SET DEFAULT 'support_agent';

-- CreateTable
CREATE TABLE "floor_layouts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "floor" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "canvas_width" INTEGER NOT NULL DEFAULT 1200,
    "canvas_height" INTEGER NOT NULL DEFAULT 800,
    "grid_size" INTEGER NOT NULL DEFAULT 20,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "bg_image_url" TEXT,
    "published_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "floor_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floor_zones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "layout_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "color" VARCHAR(20) NOT NULL DEFAULT '#E5E7EB',
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shape" VARCHAR(30) NOT NULL DEFAULT 'rectangle',
    "points" JSONB,
    "z_index" INTEGER NOT NULL DEFAULT 0,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "floor_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floor_tables" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "layout_id" UUID NOT NULL,
    "zone_id" UUID,
    "label" VARCHAR(50) NOT NULL,
    "friendly_name" VARCHAR(100),
    "shape" VARCHAR(30) NOT NULL DEFAULT 'rectangle',
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "min_capacity" INTEGER NOT NULL DEFAULT 1,
    "color" VARCHAR(20) NOT NULL DEFAULT '#6366F1',
    "category" VARCHAR(30) NOT NULL DEFAULT 'dine_in',
    "z_index" INTEGER NOT NULL DEFAULT 10,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "floor_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floor_chairs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "offset_x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "offset_y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "chair_type" VARCHAR(30) NOT NULL DEFAULT 'normal',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "floor_chairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floor_obstacles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "layout_id" UUID NOT NULL,
    "kind" VARCHAR(30) NOT NULL,
    "label" VARCHAR(100),
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "points" JSONB,
    "color" VARCHAR(20) NOT NULL DEFAULT '#9CA3AF',
    "z_index" INTEGER NOT NULL DEFAULT 5,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "floor_obstacles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merged_table_groups" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "layout_id" UUID NOT NULL,
    "group_label" VARCHAR(50) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "merged_table_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merged_table_members" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,

    CONSTRAINT "merged_table_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_permissions" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "system_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_roles" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(10),
    "color" VARCHAR(50),
    "level" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "system_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_role_permissions" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" VARCHAR(255),
    "name" VARCHAR(255),
    "phone" VARCHAR(50),
    "password_hash" TEXT,
    "is_guest" BOOLEAN NOT NULL DEFAULT true,
    "locale" VARCHAR(10) NOT NULL DEFAULT 'en-US',
    "dietary_preferences" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_sessions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "customer_id" UUID,
    "session_code" VARCHAR(20) NOT NULL,
    "status" "TableSessionStatus" NOT NULL DEFAULT 'open',
    "guest_count" INTEGER NOT NULL DEFAULT 1,
    "special_notes" TEXT,
    "opened_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ,
    "paid_at" TIMESTAMPTZ,

    CONSTRAINT "table_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "order_number" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "special_instructions" TEXT,
    "subtotal_minor" BIGINT NOT NULL DEFAULT 0,
    "tax_minor" BIGINT NOT NULL DEFAULT 0,
    "total_minor" BIGINT NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'EUR',
    "confirmed_by_id" UUID,
    "confirmed_at" TIMESTAMPTZ,
    "prep_started_at" TIMESTAMPTZ,
    "ready_at" TIMESTAMPTZ,
    "served_at" TIMESTAMPTZ,
    "served_by_id" UUID,
    "cancelled_at" TIMESTAMPTZ,
    "cancel_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "item_name" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price_minor" BIGINT NOT NULL,
    "total_price_minor" BIGINT NOT NULL,
    "selected_options" JSONB NOT NULL DEFAULT '[]',
    "special_note" TEXT,
    "status" "OrderItemStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'cash',
    "amount_minor" BIGINT NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'EUR',
    "tip_minor" BIGINT NOT NULL DEFAULT 0,
    "discount_minor" BIGINT NOT NULL DEFAULT 0,
    "discount_reason" TEXT,
    "processed_by_id" UUID,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "receipt_number" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "customer_id" UUID,
    "overall_rating" SMALLINT NOT NULL,
    "food_rating" SMALLINT,
    "service_rating" SMALLINT,
    "ambiance_rating" SMALLINT,
    "value_rating" SMALLINT,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_favorites" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "floor_layouts_tenant_id_location_id_idx" ON "floor_layouts"("tenant_id", "location_id");

-- CreateIndex
CREATE INDEX "floor_layouts_tenant_id_status_idx" ON "floor_layouts"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "floor_layouts_tenant_id_location_id_name_version_key" ON "floor_layouts"("tenant_id", "location_id", "name", "version");

-- CreateIndex
CREATE INDEX "floor_zones_tenant_id_layout_id_idx" ON "floor_zones"("tenant_id", "layout_id");

-- CreateIndex
CREATE INDEX "floor_tables_tenant_id_layout_id_idx" ON "floor_tables"("tenant_id", "layout_id");

-- CreateIndex
CREATE UNIQUE INDEX "floor_tables_tenant_id_layout_id_label_key" ON "floor_tables"("tenant_id", "layout_id", "label");

-- CreateIndex
CREATE INDEX "floor_chairs_tenant_id_table_id_idx" ON "floor_chairs"("tenant_id", "table_id");

-- CreateIndex
CREATE INDEX "floor_obstacles_tenant_id_layout_id_idx" ON "floor_obstacles"("tenant_id", "layout_id");

-- CreateIndex
CREATE INDEX "merged_table_groups_tenant_id_layout_id_idx" ON "merged_table_groups"("tenant_id", "layout_id");

-- CreateIndex
CREATE UNIQUE INDEX "merged_table_members_group_id_table_id_key" ON "merged_table_members"("group_id", "table_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_permissions_key_key" ON "system_permissions"("key");

-- CreateIndex
CREATE INDEX "system_permissions_category_idx" ON "system_permissions"("category");

-- CreateIndex
CREATE UNIQUE INDEX "system_roles_slug_key" ON "system_roles"("slug");

-- CreateIndex
CREATE INDEX "system_roles_level_idx" ON "system_roles"("level");

-- CreateIndex
CREATE UNIQUE INDEX "system_role_permissions_role_id_permission_id_key" ON "system_role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "customers_tenant_id_idx" ON "customers"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenant_id_email_key" ON "customers"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "table_sessions_session_code_key" ON "table_sessions"("session_code");

-- CreateIndex
CREATE INDEX "table_sessions_tenant_id_location_id_idx" ON "table_sessions"("tenant_id", "location_id");

-- CreateIndex
CREATE INDEX "table_sessions_tenant_id_table_id_status_idx" ON "table_sessions"("tenant_id", "table_id", "status");

-- CreateIndex
CREATE INDEX "table_sessions_session_code_idx" ON "table_sessions"("session_code");

-- CreateIndex
CREATE INDEX "orders_tenant_id_session_id_idx" ON "orders"("tenant_id", "session_id");

-- CreateIndex
CREATE INDEX "orders_tenant_id_status_idx" ON "orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "orders_tenant_id_created_at_idx" ON "orders"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "order_items_tenant_id_order_id_idx" ON "order_items"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_session_id_idx" ON "payments"("tenant_id", "session_id");

-- CreateIndex
CREATE INDEX "feedback_tenant_id_session_id_idx" ON "feedback"("tenant_id", "session_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_favorites_tenant_id_customer_id_item_id_key" ON "customer_favorites"("tenant_id", "customer_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_tenant_id_slug_key" ON "locations"("tenant_id", "slug");

-- AddForeignKey
ALTER TABLE "floor_layouts" ADD CONSTRAINT "floor_layouts_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floor_zones" ADD CONSTRAINT "floor_zones_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "floor_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floor_tables" ADD CONSTRAINT "floor_tables_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "floor_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floor_tables" ADD CONSTRAINT "floor_tables_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "floor_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floor_chairs" ADD CONSTRAINT "floor_chairs_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "floor_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floor_obstacles" ADD CONSTRAINT "floor_obstacles_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "floor_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merged_table_members" ADD CONSTRAINT "merged_table_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "merged_table_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merged_table_members" ADD CONSTRAINT "merged_table_members_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "floor_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_role_permissions" ADD CONSTRAINT "system_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "system_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_role_permissions" ADD CONSTRAINT "system_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "system_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "floor_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "table_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "table_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "table_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_favorites" ADD CONSTRAINT "customer_favorites_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
