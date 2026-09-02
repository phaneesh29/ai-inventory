import { db, itemsTable, inventoryTable, suppliersTable, supplierItemsTable } from "../src/db/index.js";
import { eq } from "drizzle-orm";

const realWorldElectronicsCatalog = [
  {
    partNumber: "ESP32-WROOM-32E-N4",
    name: "Espressif ESP32-WROOM-32E 4MB Flash Module",
    description: "Espressif 240MHz dual-core Xtensa 32-bit LX6 with integrated 4MB SPI flash and PCB trace antenna.",
    category: "Microcontroller",
    unit: "pcs",
    specifications: {
      manufacturer: "Espressif Systems",
      architecture: "Xtensa Dual-Core 32-bit LX6",
      clockSpeed: "240 MHz",
      flashSize: "4 MB",
      sramSize: "520 KB",
      wireless: "Wi-Fi 802.11 b/g/n + Bluetooth 4.2 / BLE",
      voltage: "3.0V - 3.6V",
      packageFootprint: "SMD Module 38-Pin (18x25.5mm)",
    },
  },
  {
    partNumber: "ESP32-WROOM-32E-N8",
    name: "Espressif ESP32-WROOM-32E 8MB Flash Module",
    description: "Espressif 240MHz dual-core Xtensa 32-bit LX6 with extended 8MB SPI flash for larger OTA partitions.",
    category: "Microcontroller",
    unit: "pcs",
    specifications: {
      manufacturer: "Espressif Systems",
      architecture: "Xtensa Dual-Core 32-bit LX6",
      clockSpeed: "240 MHz",
      flashSize: "8 MB",
      sramSize: "520 KB",
      wireless: "Wi-Fi 802.11 b/g/n + Bluetooth 4.2 / BLE",
      voltage: "3.0V - 3.6V",
      packageFootprint: "SMD Module 38-Pin (18x25.5mm)",
    },
  },
  {
    partNumber: "ESP32-S3-WROOM-1-N8R8",
    name: "Espressif ESP32-S3 AI Vector MCU 8MB Flash 8MB PSRAM",
    description: "Espressif dual-core Xtensa LX7 MCU with vector instructions for AI acceleration, 8MB Quad SPI Flash and 8MB Octal PSRAM.",
    category: "Microcontroller",
    unit: "pcs",
    specifications: {
      manufacturer: "Espressif Systems",
      architecture: "Xtensa Dual-Core 32-bit LX7 with Vector Extensions",
      clockSpeed: "240 MHz",
      flashSize: "8 MB",
      psramSize: "8 MB (Octal)",
      sramSize: "512 KB",
      wireless: "Wi-Fi 802.11 b/g/n (2.4GHz) + Bluetooth 5 (LE)",
      packageFootprint: "SMD Module 41-Pin (18x25.5mm)",
    },
  },
  {
    partNumber: "STM32F103C8T6",
    name: "STMicroelectronics STM32F103C8T6 ARM Cortex-M3 72MHz MCU",
    description: "STMicroelectronics mainstream performance line ARM Cortex-M3 32-bit MCU with 64KB Flash in LQFP-48.",
    category: "Microcontroller",
    unit: "pcs",
    specifications: {
      manufacturer: "STMicroelectronics",
      core: "ARM Cortex-M3",
      clockSpeed: "72 MHz",
      flashMemory: "64 KB",
      sram: "20 KB",
      packageFootprint: "LQFP-48 (7x7mm)",
      voltage: "2.0V - 3.6V",
    },
  },
  {
    partNumber: "RC0805FR-0710KL",
    name: "Yageo 10k Ohm 1% 1/8W SMD Resistor 0805",
    description: "Yageo RC0805 series thick film surface mount chip resistor 10kΩ ±1% 0.125W.",
    category: "Resistor",
    unit: "pcs",
    specifications: {
      manufacturer: "Yageo",
      resistance: "10k Ohm",
      tolerance: "±1%",
      powerRating: "0.125W (1/8W)",
      packageFootprint: "0805 (2012 Metric)",
      tempCoeff: "±100 ppm/°C",
    },
  },
  {
    partNumber: "CRCW080510K0FKEA",
    name: "Vishay Dale 10k Ohm 1% 1/8W SMD Resistor 0805",
    description: "Vishay Dale commercial thick film surface mount chip resistor 10kΩ ±1% 0.125W automotive qualified AEC-Q200.",
    category: "Resistor",
    unit: "pcs",
    specifications: {
      manufacturer: "Vishay Dale",
      resistance: "10k Ohm",
      tolerance: "±1%",
      powerRating: "0.125W (1/8W)",
      packageFootprint: "0805 (2012 Metric)",
      tempCoeff: "±100 ppm/°C",
    },
  },
  {
    partNumber: "SSD1306-0.96-OLED-I2C",
    name: "Solomon Systech SSD1306 0.96 inch 128x64 I2C OLED Display Module",
    description: "0.96-inch monochrome blue/white OLED graphic display module with built-in SSD1306 controller and I2C interface.",
    category: "Other",
    unit: "pcs",
    specifications: {
      manufacturer: "Solomon Systech",
      resolution: "128 x 64 Pixels",
      interface: "I2C (0x3C)",
      packageFootprint: "4-Pin Breakout Module",
    },
  },
];

const inventorySeedProfiles: Record<
  string,
  { onHand: number; reserved: number; threshold: number; location: string; cost: number }
> = {
  "ESP32-WROOM-32E-N4": { onHand: 850, reserved: 50, threshold: 100, location: "Warehouse Shelf A-1", cost: 2.85 },
  "ESP32-WROOM-32E-N8": { onHand: 400, reserved: 0, threshold: 50, location: "Warehouse Shelf A-2", cost: 3.20 },
  "ESP32-S3-WROOM-1-N8R8": { onHand: 250, reserved: 0, threshold: 40, location: "Warehouse Shelf A-3", cost: 4.50 },
  "STM32F103C8T6": { onHand: 600, reserved: 100, threshold: 50, location: "Warehouse Shelf B-1", cost: 2.40 },
  "RC0805FR-0710KL": { onHand: 0, reserved: 0, threshold: 2000, location: "Reel Rack 1", cost: 0.007 },
  "CRCW080510K0FKEA": { onHand: 15000, reserved: 0, threshold: 1000, location: "Reel Rack 1", cost: 0.009 },
  "SSD1306-0.96-OLED-I2C": { onHand: 0, reserved: 0, threshold: 20, location: "Display Cabinet D-1", cost: 2.20 },
};

const suppliersSeed = [
  {
    name: "DigiKey Electronics",
    code: "DIGIKEY",
    contactEmail: "sales@digikey.com",
    website: "https://www.digikey.com",
    reliabilityScore: 98.5,
    leadTimeDaysAverage: 2.0,
    paymentTerms: "Net 30",
    currency: "USD",
  },
  {
    name: "Mouser Electronics",
    code: "MOUSER",
    contactEmail: "orders@mouser.com",
    website: "https://www.mouser.com",
    reliabilityScore: 97.0,
    leadTimeDaysAverage: 3.0,
    paymentTerms: "Net 30",
    currency: "USD",
  },
  {
    name: "LCSC Electronics",
    code: "LCSC",
    contactEmail: "support@lcsc.com",
    website: "https://www.lcsc.com",
    reliabilityScore: 92.0,
    leadTimeDaysAverage: 7.0,
    paymentTerms: "Prepaid",
    currency: "USD",
  },
];

export const seedDatabase = async () => {
  console.log("1. Seeding master components...");
  for (const item of realWorldElectronicsCatalog) {
    await db
      .insert(itemsTable)
      .values(item)
      .onConflictDoUpdate({
        target: itemsTable.partNumber,
        set: {
          name: item.name,
          description: item.description,
          category: item.category,
          unit: item.unit,
          specifications: item.specifications,
          updatedAt: new Date(),
        },
      });
  }

  console.log("2. Seeding warehouse inventory...");
  const allItems = await db.select().from(itemsTable);
  const itemMap = new Map(allItems.map((i) => [i.partNumber, i.id]));

  for (const [partNumber, profile] of Object.entries(inventorySeedProfiles)) {
    const itemId = itemMap.get(partNumber);
    if (!itemId) continue;

    await db
      .insert(inventoryTable)
      .values({
        itemId,
        quantityOnHand: profile.onHand,
        quantityReserved: profile.reserved,
        reorderThreshold: profile.threshold,
        location: profile.location,
        unitCost: profile.cost,
      })
      .onConflictDoUpdate({
        target: inventoryTable.itemId,
        set: {
          quantityOnHand: profile.onHand,
          quantityReserved: profile.reserved,
          reorderThreshold: profile.threshold,
          location: profile.location,
          unitCost: profile.cost,
          updatedAt: new Date(),
        },
      });
  }

  console.log("3. Seeding suppliers and catalog quotes...");
  for (const s of suppliersSeed) {
    const [supplier] = await db
      .insert(suppliersTable)
      .values(s)
      .onConflictDoUpdate({
        target: suppliersTable.code,
        set: {
          name: s.name,
          reliabilityScore: s.reliabilityScore,
          leadTimeDaysAverage: s.leadTimeDaysAverage,
          updatedAt: new Date(),
        },
      })
      .returning();

    const oledItemId = itemMap.get("SSD1306-0.96-OLED-I2C");
    if (oledItemId && supplier) {
      const price = supplier.code === "LCSC" ? 1.85 : supplier.code === "DIGIKEY" ? 2.10 : 2.35;
      const leadTime = supplier.code === "DIGIKEY" ? 2.0 : supplier.code === "MOUSER" ? 3.0 : 7.0;

      await db
        .insert(supplierItemsTable)
        .values({
          supplierId: supplier.id,
          itemId: oledItemId,
          supplierPartNumber: `${supplier.code}-OLED-096-I2C`,
          unitPrice: price,
          minimumOrderQuantity: supplier.code === "LCSC" ? 10 : 1,
          stockAvailable: 50000,
          leadTimeDays: leadTime,
          priceTiers: [
            { minQuantity: 1, unitPrice: price },
            { minQuantity: 50, unitPrice: price * 0.9 },
            { minQuantity: 500, unitPrice: price * 0.8 },
          ],
          isPreferred: supplier.code === "DIGIKEY",
        })
        .onConflictDoUpdate({
          target: [supplierItemsTable.supplierId, supplierItemsTable.itemId],
          set: {
            unitPrice: price,
            stockAvailable: 50000,
            leadTimeDays: leadTime,
            updatedAt: new Date(),
          },
        });
    }
  }

  console.log("✅ Seed complete!");
};

seedDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
