import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { FournisseurMembre } from "@/lib/membre";
import { EnregistrementSW } from "@/components/EnregistrementSW";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Mon Relais Presta – L'entraide entre prestataires mariage",
    template: "%s · Mon Relais Presta",
  },
  description:
    "Transmettez les demandes de mariés que vous ne pouvez pas prendre, et suivez ce qu'elles deviennent. Wedding Presta Club (PACA) et Wedding Social Hub (Rhône-Alpes).",
  applicationName: "Mon Relais Presta",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Relais Presta", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#F4EDE4",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${poppins.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <FournisseurMembre>{children}</FournisseurMembre>
        <EnregistrementSW />
      </body>
    </html>
  );
}
