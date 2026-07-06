/* =========================================================================
   Seeds DynamoDB with the production baseline: catalog products, categories,
   suppliers, warehouse locations and app settings.
   Deliberately NOT seeded (they were demo mockups): orders, customers,
   staff, purchase orders, movements, promotions.

   Usage: node scripts/seed-aws.mjs   (after provision-aws.mjs)
   Add --force to overwrite items that already exist.
   ========================================================================= */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { readFileSync, existsSync } from "node:fs";

/* pull table/region from .env.local so this always matches provisioning */
const envPath = new URL("../.env.local", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const env = Object.fromEntries(
  (existsSync(envPath) ? readFileSync(envPath, "utf8") : "")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);
const REGION = env.AWS_REGION || process.env.AWS_REGION || "us-east-1";
const TABLE = env.NEXT_PUBLIC_SATYA_TABLE || env.SATYA_TABLE || "satya-app";
const FORCE = process.argv.includes("--force");

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
  marshallOptions: { removeUndefinedValues: true },
});

const now = Date.now();
const P = (id, name, dep, price, pack, unit, tag, stock) =>
  ({ id, name, dep, price, pack, unit, tag, stock, active: true, created: now });

const PRODUCTS = [
  P(2798, "4K'S Cigarillo 4F99 Diamond", "tobacco", 10.42, "10/4ct", "case", "pop", 180),
  P(6510, "4K'S Cigarillo 4F99 Black Sweets", "tobacco", 10.42, "10/4ct", "case", null, 140),
  P(2708, "4K'S Cigarillo 4F99 Mango", "tobacco", 10.42, "10/4ct", "case", null, 96),
  P(5127, "24/7 King Red Carton", "tobacco", 60.0, "10 packs", "carton", null, 94),
  P(5128, "24/7 King Gold Carton", "tobacco", 60.0, "10 packs", "carton", null, 94),
  P(5180, "24/7 100 Silver Carton", "tobacco", 60.0, "10 packs", "carton", "low", 12),
  P(3300, "Beech-Nut Wintergreen 3oz", "tobacco", 38.5, "12ct", "case", null, 60),
  P(2453, "Blue Legend Hookah 100g", "tobacco", 16.75, "10ct", "case", null, 36),
  P(5510, "Breeze Pro 2% Assorted", "vape", 53.0, "10ct", "display", "pop", 210),
  P(5310, "Mr Fog Switch 5500", "vape", 149.5, "10ct", "display", "new", 103),
  P(5402, "EB Design BC5000 Mix", "vape", 88.0, "10ct", "display", null, 73),
  P(5601, "JUUL Pods Virginia Tobacco", "vape", 74.0, "8ct", "box", null, 17),
  P(5705, "Vuse Alto Golden Tobacco", "vape", 62.4, "5ct", "box", null, 14),
  P(5810, "E-Liquid Salt 30ml Mix", "vape", 46.0, "10ct", "box", null, 46),
  P(7120, "ZYN Cool Mint 6mg", "vape", 78.4, "5/15ct", "case", "pop", 150),
  P(4401, "3 Kings Hookah Charcoal Big", "smoke", 16.97, "1 case", "case", null, 98),
  P(3612, "3 Kings Hookah Charcoal Small", "smoke", 13.5, "1 case", "case", null, 80),
  P(4797, "3-in-1 Pipe Set", "smoke", 24.0, "12ct", "case", null, 40),
  P(4801, "Clipper Lighter Tray 48ct", "smoke", 34.99, "48ct", "tray", "pop", 107),
  P(4852, "Cigarette Tubes 200ct", "smoke", 2.1, "50ct", "box", null, 52),
  P(1981, "357 Magnum BTL", "hba", 60.0, "36ct", "case", null, 90),
  P(1980, "357 PK 24ct", "hba", 24.0, "24ct", "case", null, 72),
  P(7250, "5-Hour Energy Berry 12ct", "hba", 18.99, "12ct", "case", "pop", 59),
  P(7310, "Assorted Pain Relief Packets", "hba", 22.4, "30ct", "box", null, 127),
  P(6411, "Candy Treasure Assorted Mix", "grocery", 44.99, "1 case", "case", "pop", 300),
  P(6610, "Twix Cookie Dough King 24ct", "grocery", 30.99, "24ct", "box", "new", 120),
  P(6240, "Essentia Water 24pk", "grocery", 22.8, "24pk", "case", null, 101),
  P(6720, "Pop Cones Pre-Roll Display", "grocery", 38.0, "24ct", "display", "new", 64),
  P(6810, "Household Cleaning Caddy", "grocery", 40.0, "mixed", "case", null, 80),
  P(6905, "Big Dog Pet Treats 12ct", "grocery", 19.5, "12ct", "case", null, 9),
  P(8010, "Car Fresh Fiber Can 1.05oz", "auto", 12.5, "12ct", "case", null, 33),
  P(8020, "Rain-X 2-in-1 Windshield Solvent", "auto", 24.0, "6ct", "case", "low", 4),
  P(8110, "Booster Cables 8ft 200A", "auto", 28.0, "6ct", "case", null, 27),
  P(9010, "Phone Charging Cable Asst.", "acc", 32.0, "24ct", "case", "pop", 85),
  P(9110, "Fashion Sunglasses Display", "acc", 48.0, "36ct", "display", null, 260),
  P(9210, "4-in-1 Utility Jar", "acc", 12.0, "12ct", "case", null, 98),
];

const CATEGORY_META = {
  tobacco: ["Tobacco", "Cigarettes, cigars, chewing, hookah and pipe.", "Tobacco & vapor"],
  vape: ["Vape", "Disposables, pods and e-liquids.", "Tobacco & vapor"],
  smoke: ["Smoking Acc.", "Lighters, glass, rolling supplies and butane.", "Tobacco & vapor"],
  hba: ["HBA", "Medicine, energy shots and personal care.", "Center store"],
  grocery: ["Grocery & Candy", "Candy, snacks, beverages and household.", "Center store"],
  auto: ["Automotive", "Air fresheners, fluids and road essentials.", "General merch"],
  acc: ["Accessories", "Charging cables, fashion and general merch.", "General merch"],
};
const CATEGORIES = Object.entries(CATEGORY_META).map(([key, [name, details, group]], i) => ({
  id: "CAT-" + (101 + i), key, name, parent: null, active: true, details, icon: "", image: "", group, created: now,
}));

const SUPPLIERS = [
  { id: "SUP-06", name: "A.H. Jamra Company", contact: "Kyle Weldon", email: "orders@ahjamra.com", phone: "(419) 248-3393",
    leadDays: 1, terms: "COD Cash Only", status: "Active",
    address: "201 South Saint Clair Street", city: "Toledo", state: "OH", zip: "43604",
    accountNo: "92100016", salesRep: "Kyle Weldon", deliveryDay: "Thursday", truck: "402", stop: "92",
    categories: "Cigarettes, tobacco, cigars, candy, groceries",
    notes: "OTP tax paid by supplier. Claims within 24 hours of delivery." },
  { id: "SUP-07", name: "Topicz", contact: "Chris Fessenden", email: "account.receivable@topicz.com", phone: "(513) 351-7700",
    leadDays: 2, terms: "7 Days EFT", status: "Active",
    address: "2121 Section Road", city: "Cincinnati", state: "OH", zip: "45222", website: "www.topicz.com",
    accountNo: "904722", salesRep: "Allen Tucker", csr: "Chris Fessenden", deliveryDay: "Thursday", truck: "401", stop: "360",
    categories: "Cigarettes, cigars, tobacco, candy, HBC, grocery",
    notes: "OH & WV tobacco tax paid. Tobacco licenses: OH 92-100-001, IN 10222, KY 2000005. Shortages must be reported within 24 hours of delivery; past-due invoices accrue 1.5% monthly service charges." },
];

const mkLoc = (zone, aisle, rack, bin, capacity) =>
  ({ id: `${zone}-${aisle}-${rack}-${bin}`, zone, aisle, rack, bin, capacity, used: 0 });
const LOCATIONS = [
  mkLoc("A", "01", "R1", "B1", 240), mkLoc("A", "01", "R1", "B2", 240),
  mkLoc("A", "02", "R1", "B1", 240), mkLoc("A", "02", "R2", "B1", 240),
  mkLoc("B", "01", "R1", "B1", 180), mkLoc("B", "01", "R1", "B2", 180),
  mkLoc("B", "02", "R3", "B1", 180), mkLoc("C", "01", "R1", "B1", 320),
  mkLoc("C", "02", "R2", "B4", 320), mkLoc("D", "01", "R1", "B1", 120),
];

const SETTINGS = { id: "main", taxRate: 6.5, taxLabel: "OH sales tax", lowStock: 20 };

async function existingIds(type) {
  const ids = new Set();
  let cursor;
  do {
    const r = await doc.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": `T#${type}` },
      ProjectionExpression: "SK",
      ExclusiveStartKey: cursor,
    }));
    r.Items?.forEach((i) => ids.add(i.SK));
    cursor = r.LastEvaluatedKey;
  } while (cursor);
  return ids;
}

async function seed(type, items, idOf) {
  const have = FORCE ? new Set() : await existingIds(type);
  let wrote = 0;
  for (const item of items) {
    const id = String(idOf(item));
    if (have.has(id)) continue;
    await doc.send(new PutCommand({
      TableName: TABLE,
      Item: { PK: `T#${type}`, SK: id, ...item },
    }));
    wrote++;
  }
  console.log(`  ${type}: ${wrote} written${have.size ? `, ${items.length - wrote} already present` : ""}`);
}

console.log(`\nSeeding ${TABLE} in ${REGION}${FORCE ? " (force)" : ""}\n`);
await seed("products", PRODUCTS, (p) => p.id);
await seed("categories", CATEGORIES, (c) => c.key);
await seed("suppliers", SUPPLIERS, (s) => s.id);
await seed("locations", LOCATIONS, (l) => l.id);
await seed("settings", [SETTINGS], (s) => s.id);
console.log(`\nDone. Orders, accounts, POs, promotions start empty — that data now only comes from real use.\n`);
