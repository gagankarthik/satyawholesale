import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Return Policy · Satya Wholesale" };

export default function Returns() {
  return (
    <LegalPage
      title="Return Policy"
      updated="June 2026"
      intro="Returns are handled on a wholesale, business-to-business basis. Because we distribute age-restricted and regulated products, some categories cannot be returned once they leave our warehouse."
      sections={[
        { h: "Damages & shortages", p: [
          "Inspect every delivery at receipt. Report damaged cases, shortages or mispicks within 48 hours of delivery with your order number and photos. Verified issues are credited or replaced on the next delivery.",
        ] },
        { h: "Non-returnable items", p: [
          "Tobacco, vapor and nicotine products, and any opened or tampered cases, cannot be returned once accepted, in line with state and federal law.",
          "Clearance and special-order items are final sale.",
        ] },
        { h: "Eligible returns", p: [
          "Unopened, resalable non-regulated cases may be returned within 14 days with prior authorization. A restocking fee may apply. Contact your rep to start a return authorization before shipping anything back.",
        ] },
        { h: "Recalls", p: [
          "If a product is recalled, we will notify affected accounts and coordinate return or destruction per the manufacturer and regulator instructions.",
        ] },
        { h: "Credits", p: [
          "Approved credits are applied to your trade account and reflected on your next statement, or refunded to the original payment method where applicable.",
        ] },
      ]}
    />
  );
}
