import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import "./app.css";
import AgeGate from "@/components/AgeGate";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Satya Wholesale — Cincinnati cash & carry distributor for convenience stores",
  description:
    "A licensed wholesale and cash-and-carry distributor in Cincinnati, Ohio, supplying independent convenience retailers across Greater Cincinnati and the Tri-State. Seven departments, consistent stock, one invoice, one delivery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
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
