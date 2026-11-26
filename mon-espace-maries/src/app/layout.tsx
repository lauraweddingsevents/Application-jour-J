import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { FournisseurSession } from "@/lib/session";
import { EnregistrementSW } from "@/components/EnregistrementSW";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Mon Espace Mariés", template: "%s · Mon Espace Mariés" },
  description: "L'espace privé des mariés de Laura Weddings & Events : avancée de l'organisation, paiements, documents et souvenirs.",
  applicationName: "Mon Espace Mariés",
  appleWebApp: { capable: true, title: "Espace Mariés", statusBarStyle: "default" },
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#F5EEE4",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} ${cormorant.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <FournisseurSession>{children}</FournisseurSession>
        <EnregistrementSW />
      </body>
    </html>
  );
}
