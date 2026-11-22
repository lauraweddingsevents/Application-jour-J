import type { Metadata } from "next";
import { Coquille } from "@/components/Coquille";
import { MonProfil } from "./MonProfil";

export const metadata: Metadata = { title: "Mon profil" };

export default function PageProfil() {
  return (
    <Coquille>
      <MonProfil />
    </Coquille>
  );
}
