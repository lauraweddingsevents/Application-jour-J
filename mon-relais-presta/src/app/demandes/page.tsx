import type { Metadata } from "next";
import { Coquille } from "@/components/Coquille";
import { ListeDemandes } from "./ListeDemandes";

export const metadata: Metadata = { title: "Demandes" };

export default function PageDemandes() {
  return (
    <Coquille>
      <ListeDemandes />
    </Coquille>
  );
}
