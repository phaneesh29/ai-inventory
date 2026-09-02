CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"quantity_on_hand" double precision DEFAULT 0 NOT NULL,
	"quantity_reserved" double precision DEFAULT 0 NOT NULL,
	"reorder_threshold" double precision DEFAULT 10 NOT NULL,
	"location" varchar(100) DEFAULT 'Main Warehouse' NOT NULL,
	"unit_cost" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;