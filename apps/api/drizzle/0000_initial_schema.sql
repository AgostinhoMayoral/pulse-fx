-- Initial schema for Pulse FX
CREATE TYPE "public"."source" AS ENUM('BCB_OLINDA', 'BCB_SGS', 'FRED');
CREATE TYPE "public"."periodicity" AS ENUM('DAILY', 'MONTHLY');
CREATE TYPE "public"."sync_status" AS ENUM('running', 'completed', 'failed', 'partial');

CREATE TABLE "indicators" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "source" "source" NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "periodicity" "periodicity" NOT NULL,
  "variation_rule" text NOT NULL,
  "history_window_days" integer NOT NULL,
  "external_series_id" text,
  "currency_pair" text,
  "last_synced_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "indicators_code_unique" UNIQUE("code")
);

CREATE TABLE "observations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "indicator_id" uuid NOT NULL,
  "reference_date" date NOT NULL,
  "value" numeric(18, 6) NOT NULL
);

CREATE TABLE "favorites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" text NOT NULL,
  "indicator_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "sync_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source" text NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "finished_at" timestamp with time zone,
  "status" "sync_status" DEFAULT 'running' NOT NULL,
  "records_upserted" integer DEFAULT 0 NOT NULL,
  "error_message" text
);

ALTER TABLE "observations" ADD CONSTRAINT "observations_indicator_id_indicators_id_fk"
  FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "favorites" ADD CONSTRAINT "favorites_indicator_id_indicators_id_fk"
  FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX "observations_indicator_date_unique" ON "observations" USING btree ("indicator_id","reference_date");
CREATE UNIQUE INDEX "favorites_client_indicator_unique" ON "favorites" USING btree ("client_id","indicator_id");
