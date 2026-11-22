import type { Metadata } from "next";
import { Coquille } from "@/components/Coquille";
import { MesSuivis } from "./MesSuivis";

export const metadata: Metadata = { title: "Mes suivis" };

export default function PageMesSuivis() {
  return (
    <Coquille>
      <MesSuivis />
    </Coquille>
  );
}
