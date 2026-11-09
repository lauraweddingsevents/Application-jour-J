import type { Metadata } from "next";
import { Tableau } from "./Tableau";

export const metadata: Metadata = { title: "Mes mariages" };

export default function PageTableau() {
  return <Tableau />;
}
