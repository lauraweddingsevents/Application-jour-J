import type { Metadata } from "next";
import { MonCompte } from "./MonCompte";

export const metadata: Metadata = { title: { absolute: "Mon compte" }, robots: { index: false } };

export default function Page() {
  return <MonCompte />;
}
