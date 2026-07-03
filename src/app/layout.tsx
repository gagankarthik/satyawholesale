import type { Metadata } from "next";
import { Roboto, Open_Sans, Roboto_Mono } from "next/font/google";
import "./globals.css";
import "./app.css";
import AgeGate from "@/components/AgeGate";

/* Two-family system: Roboto carries headlines and data (Roboto Mono for
   SKUs, prices, invoice numbers), Open Sans carries body text. */
const display = Roboto({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

const body = Open_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const DESCRIPTION =
  "Satya Wholesale is a licensed wholesale and cash-and-carry distributor in Cincinnati, Ohio, supplying independent convenience retailers across Greater Cincinnati with tobacco, vape, grocery, candy, HBA and more on one trade account.";

export const metadata: Metadata = {
  metadataBase: new URL("https://satyawholesalers.com"),
  title: {
    default: "Satya Wholesale | Cash & carry distributor for convenience stores",
    template: "%s · Satya Wholesale",
  },
  description: DESCRIPTION,
  applicationName: "Satya Wholesale",
  keywords: [
    "wholesale distributor Cincinnati",
    "cash and carry distributor Ohio",
    "convenience store supplier",
    "tobacco distributor Cincinnati",
    "vape wholesale Ohio",
    "candy and grocery wholesale",
    "c-store distributor Greater Cincinnati",
  ],
  authors: [{ name: "Satya Wholesale" }],
  category: "business",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Satya Wholesale",
    title: "Satya Wholesale | Cash & carry distributor",
    description: DESCRIPTION,
    url: "https://satyawholesalers.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Satya Wholesale | Cash & carry distributor",
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>
        <a href="#main" className="skip">Skip to content</a>
        {process.env.NEXT_PUBLIC_SKIP_AGEGATE ? null : <AgeGate />}
        {children}
      </body>
    </html>
  );
}
