ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SMTP_SETTINGS_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SMTP_TEST_QUEUED';

CREATE TABLE IF NOT EXISTS "smtp_settings" (
  "id" TEXT NOT NULL,
  "host" TEXT,
  "port" INTEGER NOT NULL DEFAULT 587,
  "username" TEXT,
  "password_cipher" TEXT,
  "secure" BOOLEAN NOT NULL DEFAULT false,
  "require_tls" BOOLEAN NOT NULL DEFAULT true,
  "from_email" TEXT,
  "from_name" TEXT NOT NULL DEFAULT 'Enterprise File Repository',
  "reply_to" TEXT,
  "last_test_status" TEXT NOT NULL DEFAULT 'not_run',
  "last_tested_at" TIMESTAMP(3),
  "updated_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "smtp_settings_pkey" PRIMARY KEY ("id")
);
