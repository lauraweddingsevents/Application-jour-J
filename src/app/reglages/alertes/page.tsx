import type { Metadata } from "next";
import { ConfigurationAlertes } from "./ConfigurationAlertes";

export const metadata: Metadata = { title: "Configurer les alertes", robots: { index: false } };

export default function Page() {
  return <ConfigurationAlertes />;
}
