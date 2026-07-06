import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy · Satya Wholesale" };

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="June 2026"
      intro="Satya Wholesale serves licensed retail businesses, not the general public. This policy explains what business information we collect to operate customer accounts and fulfill orders, and how we handle it."
      sections={[
        { h: "Information we collect", p: [
          "Business account data you provide when applying for customer access: store name, contact name, email, phone, business and tobacco license numbers, and delivery address.",
          "Order and transaction data: products ordered, quantities, pricing, fulfillment method, payment terms and delivery records.",
          "Site usage data such as pages viewed and device type, used to keep the site secure and improve it.",
        ] },
        { h: "How we use it", p: [
          "To verify eligibility for a customer account, process and deliver orders, manage invoicing and terms, and provide support.",
          "To meet our legal obligations as a licensed tobacco and wholesale distributor, including age- and license-verification recordkeeping.",
        ] },
        { h: "Sharing", p: [
          "We do not sell account information. We share data only with delivery carriers, payment processors and regulators where required by law, and only as needed to complete a transaction or comply with a legal request.",
        ] },
        { h: "Retention & security", p: [
          "We retain customer account and transaction records for the period required by applicable tax and tobacco regulations. Access is restricted to authorized staff and protected with administrative and technical safeguards.",
        ] },
        { h: "Your choices", p: [
          "You may request access to, correction of, or deletion of your business account information, subject to records we are legally required to keep. Contact us using the details below.",
        ] },
      ]}
    />
  );
}
