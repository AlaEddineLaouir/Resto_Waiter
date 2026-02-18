-- Migration: Introduce TenantUserRole enum with 4 roles
-- Maps old string values: owner → admin, menu_editor → manager, foh_staff → waiter, kitchen_staff → chef

-- Step 1: Convert old role strings to new values while still VARCHAR
UPDATE "admin_users" SET role = 'admin' WHERE role = 'owner';
UPDATE "admin_users" SET role = 'manager' WHERE role = 'menu_editor';
UPDATE "admin_users" SET role = 'waiter' WHERE role = 'foh_staff';
UPDATE "admin_users" SET role = 'chef' WHERE role = 'kitchen_staff';

-- Step 2: Create the enum type
CREATE TYPE "TenantUserRole" AS ENUM ('admin', 'manager', 'chef', 'waiter');

-- Step 3: Convert the column from VARCHAR to enum
ALTER TABLE "admin_users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "admin_users" ALTER COLUMN "role" TYPE "TenantUserRole" USING ("role"::text::"TenantUserRole");
ALTER TABLE "admin_users" ALTER COLUMN "role" SET DEFAULT 'manager';

-- Step 4: Add columns that may have been added after init migration
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "display_name" VARCHAR(255);
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "permissions" JSONB DEFAULT '[]';
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "location_ids" UUID[] DEFAULT '{}';
