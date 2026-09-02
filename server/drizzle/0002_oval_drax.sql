CREATE TABLE "supplier_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"supplier_part_number" varchar(100) NOT NULL,
	"unit_price" double precision NOT NULL,
	"minimum_order_quantity" double precision DEFAULT 1 NOT NULL,
	"package_type" varchar(100) DEFAULT 'Bulk' NOT NULL,
	"stock_available" double precision DEFAULT 0 NOT NULL,
	"lead_time_days" double precision DEFAULT 3 NOT NULL,
	"price_tiers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_preferred" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"website" varchar(255),
	"reliability_score" double precision DEFAULT 95 NOT NULL,
	"lead_time_days_average" double precision DEFAULT 3 NOT NULL,
	"payment_terms" varchar(100) DEFAULT 'Net 30' NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "supplier_items" ADD CONSTRAINT "supplier_items_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_items" ADD CONSTRAINT "supplier_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_item_unique_idx" ON "supplier_items" USING btree ("supplier_id","item_id");