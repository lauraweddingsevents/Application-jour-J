import type { Metadata } from "next";
import { MesPlans } from "./MesPlans";

export const metadata: Metadata = { title: { absolute: "Mes plans · Mon plan de salle" } };

export default function Page() {
  return <MesPlans />;
}
