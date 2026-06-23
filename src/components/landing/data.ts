import {
  Check, Phone, Store, Truck, Receipt, Shield,
  DeptLeaf, DeptDrop, DeptFlame, DeptPlus, DeptCart, DeptCar, DeptPhone,
} from "@/components/Icons";

/* Unsplash helper + landing content. Shared by the landing section components. */
export const ush = (id: string, w = 1000) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const DEPARTMENTS = [
  { Icon: DeptLeaf, name: "Tobacco", desc: "Cigarettes, cigars, cigarillos, chewing, hookah and pipe — the cornerstone of the counter, kept deep and in stock." },
  { Icon: DeptDrop, name: "Vape", desc: "A full wall of disposables, pods and e-liquids from the categories your regulars ask for, restocked weekly." },
  { Icon: DeptFlame, name: "Smoking Accessories", desc: "Lighters, glass, rolling supplies, butane, charcoal and the impulse buys that ring up beside them." },
  { Icon: DeptPlus, name: "Health & Beauty", desc: "Everyday medicine, energy shots, supplements and personal care for the aisle that turns over fast." },
  { Icon: DeptCart, name: "Grocery & Candy", desc: "Candy, snacks, beverages and household staples — the center-store breadth a c-store needs in one stop." },
  { Icon: DeptCar, name: "Automotive", desc: "Air fresheners, fluids, windshield care and the road essentials drivers reach for at the register." },
  { Icon: DeptPhone, name: "Phone & Accessories", desc: "Charging cables, fashion accessories and general merchandise to round out the front counter." },
];

export const HERO_IMAGES = [
  { id: "1553413077-190dd305871c", alt: "Pallet racking inside a wholesale distribution warehouse" },
  { id: "1586528116311-ad8dd3c8310d", alt: "Cases of stocked goods on warehouse shelving" },
  { id: "1565891741441-64926e441838", alt: "Loaded distribution yard ready for dispatch" },
];

export const SERVICE = [
  { Icon: Store, n: "At the warehouse", h: "Cash & carry", img: "1494412519320-aa613dfb7738", p: "Walk our Reading Road floor, load your own cases and check out the same day. No appointment, no minimum." },
  { Icon: Truck, n: "Across the region", h: "Regional delivery", img: "1601584115197-04ecc0da31d7", p: "Place an order from the trade portal and we deliver across Greater Cincinnati — typically next day." },
  { Icon: Receipt, n: "One invoice", h: "A single account", img: "1605902711622-cfb43c4437b5", p: "Tobacco, grocery, HBA and automotive on one bill and one drop-off, instead of chasing five separate suppliers." },
];

export const STRENGTHS = [
  { h: "Licensed & compliant", p: "A fully licensed wholesale and tobacco distributor — every account is verified and age-restricted to 21+." },
  { h: "Consistent, deep stock", p: "A deep, well-kept range across every department, so a full restock rarely comes back short." },
  { h: "One invoice, one delivery", p: "Consolidate the whole counter onto a single order, a single bill and a single drop-off each week." },
  { h: "Local Cincinnati partner", p: "Based on Reading Road and serving Greater Cincinnati directly — not a distant warehouse or a marketplace." },
];

export const REQS = [
  { Icon: Receipt, h: "Business license", p: "Proof your store is a registered business." },
  { Icon: Shield, h: "Tobacco license", p: "Required for the regulated tobacco categories." },
  { Icon: Phone, h: "Store contact details", p: "Address, phone and delivery instructions." },
  { Icon: Check, h: "Age verification (21+)", p: "Confirming every buyer is 21 or older." },
];
