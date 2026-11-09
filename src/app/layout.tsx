import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { EnregistrementHorsLigne } from "@/components/EnregistrementHorsLigne";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ma Coordo – Le déroulé du jour J partagé en temps réel",
    template: "%s · Ma Coordo",
  },
  description:
    "Le déroulé du jour J partagé en temps réel avec vos prestataires et vos proches.",
  applicationName: "Ma Coordo",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Ma Coordo",
    statusBarStyle: "default",
  },
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
      <body className="min-h-full flex flex-col">
        {children}
        <EnregistrementHorsLigne />
      </body>
    </html>
  );
}
