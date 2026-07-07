/* Continuous ticker: the trust claims and the departments in one moving band.
   The set renders twice so the loop is seamless; the second copy is
   decorative and hidden from readers. */
const ITEMS = [
  "Licensed Distributor", "Tobacco", "Vape", "Smoking Accessories",
  "Health & Beauty", "Grocery & Candy", "Automotive", "Phone Accessories",
  "Cash & Carry", "Store Delivery", "One Invoice", "21+ Wholesale",
];

function Set({ hidden }: { hidden?: boolean }) {
  return (
    <div className="marquee-set" aria-hidden={hidden || undefined}>
      {ITEMS.map((t) => (
        <span key={t}>{t} <i /></span>
      ))}
    </div>
  );
}

export default function Marquee() {
  return (
    <div className="marquee" role="marquee" aria-label="What Satya Wholesale distributes">
      <div className="marquee-track">
        <Set />
        <Set hidden />
      </div>
    </div>
  );
}
