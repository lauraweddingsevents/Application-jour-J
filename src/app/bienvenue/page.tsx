import type { Metadata } from "next";
import { Bienvenue } from "./Bienvenue";

export const metadata: Metadata = { title: { absolute: "Bienvenue" } };

export default function Page() {
  return <Bienvenue />;
}
