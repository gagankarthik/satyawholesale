import {
  Check, Phone, Store, Truck, Receipt, Shield,
  DeptLeaf, DeptDrop, DeptFlame, DeptPlus, DeptCart, DeptCar, DeptPhone,
} from "@/components/Icons";

/* Unsplash helper + landing content. Shared by the landing section components. */
export const ush = (id: string, w = 1000) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const DEPARTMENTS = [
  { Icon: DeptLeaf, name: "Tobacco", img: "1586528116311-ad8dd3c8310d", desc: "Cigarettes, cigars, cigarillos, chew, hookah and pipe tobacco. Your highest-volume category, kept deep and restocked every week." },
  { Icon: DeptDrop, name: "Vape", img: "1601584115197-04ecc0da31d7", desc: "Disposables, pods and e-liquids across the brands your regulars ask for, with new releases added as they come in." },
  { Icon: DeptFlame, name: "Smoking Accessories", img: "1567861911437-538298e4232c", desc: "Lighters, glass, rolling papers, butane and charcoal, plus the impulse buys that sell right beside them." },
  { Icon: DeptPlus, name: "Health & Beauty", img: "1556228578-8c89e6adf883", desc: "OTC medicine, energy shots, supplements and personal care for a fast-moving, high-margin aisle." },
  { Icon: DeptCart, name: "Grocery & Candy", img: "1604719312566-8912e9227c6a", desc: "Candy, snacks, beverages and household staples to fill out your center store in a single stop." },
  { Icon: DeptCar, name: "Automotive", img: "1486262715619-67b85e0b08d3", desc: "Air fresheners, motor oil, windshield fluid and the road essentials drivers grab at the register." },
  { Icon: DeptPhone, name: "Phone & Accessories", img: "1511707171634-5f897ff02aa9", desc: "Charging cables, earbuds, phone accessories and general merchandise to round out the front counter." },
];

export const HERO_IMAGES = [
  { id: "1553413077-190dd305871c", alt: "Pallet racking inside a wholesale distribution warehouse" },
  { id: "1586528116311-ad8dd3c8310d", alt: "Cases of stocked goods on warehouse shelving" },
  { id: "1565891741441-64926e441838", alt: "Loaded distribution yard ready for dispatch" },
];

export const SERVICE = [
  { Icon: Store, n: "At the warehouse", h: "Cash & carry", img: "1494412519320-aa613dfb7738", p: "Walk our Reading Road floor, load your own cases and check out the same day. No appointment and no order minimum." },
  { Icon: Truck, n: "Across the region", h: "Regional delivery", img: "1601584115197-04ecc0da31d7", p: "Order from the trade portal and we deliver across Greater Cincinnati, usually the next business day." },
  { Icon: Receipt, n: "One invoice", h: "A single account", img: "1605902711622-cfb43c4437b5", p: "Put tobacco, grocery, health and beauty, and automotive on one bill and one delivery instead of managing five separate suppliers." },
];

export const STRENGTHS = [
  { h: "Licensed & compliant", p: "A fully licensed wholesale and tobacco distributor. Every account is verified and limited to buyers 21 and older." },
  { h: "Consistent, deep stock", p: "We carry a deep range in every department and restock weekly, so a full order rarely comes back short." },
  { h: "One invoice, one delivery", p: "Consolidate your order onto one account, one bill and one weekly drop-off at your store." },
  { h: "Local Cincinnati partner", p: "We operate from Reading Road and serve Greater Cincinnati ourselves. You deal with the warehouse, not a call center." },
];

export const REQS = [
  { Icon: Receipt, h: "Business license", p: "Proof your store is a registered business." },
  { Icon: Shield, h: "Tobacco license", p: "Required for the regulated tobacco categories." },
  { Icon: Phone, h: "Store contact details", p: "Address, phone and delivery instructions." },
  { Icon: Check, h: "Age verification (21+)", p: "Confirming every buyer is 21 or older." },
];
