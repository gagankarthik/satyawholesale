import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Service — Satya Wholesale" };

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="June 2026"
      intro="These terms govern use of the Satya Wholesale site and order portal by approved trade accounts. By opening an account or placing an order, your business agrees to them."
      sections={[
        { h: "Eligibility", p: [
          "The portal is for verified retail businesses only. Accounts require a valid business license, and a tobacco license for regulated categories. All buyers must be 21 or older. We may decline or revoke access at our discretion.",
        ] },
        { h: "Accounts", p: [
          "You are responsible for the accuracy of your business details and for activity under your login. Keep credentials secure and notify us immediately of any unauthorized use.",
        ] },
        { h: "Orders & pricing", p: [
          "Prices are wholesale, per case, and may change without notice. Orders are subject to acceptance and stock availability. We may limit quantities on regulated products.",
        ] },
        { h: "Payment terms", p: [
          "Approved accounts may be offered terms (e.g., Net 15 / Net 30). Past-due balances may pause ordering. Cash-and-carry and card-on-delivery options are available where indicated.",
        ] },
        { h: "Compliance", p: [
          "All sales comply with applicable state and federal law, including age verification and tobacco-distribution requirements. You agree to resell products lawfully and to maintain your own required licenses.",
        ] },
        { h: "Limitation of liability", p: [
          "The site and portal are provided “as is.” To the extent permitted by law, Satya Wholesale is not liable for indirect or consequential damages arising from use of the service.",
        ] },
      ]}
    />
  );
}
