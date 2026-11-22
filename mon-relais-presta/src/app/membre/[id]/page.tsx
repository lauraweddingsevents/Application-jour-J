import type { Metadata } from "next";
import { Coquille } from "@/components/Coquille";
import { FicheMembre } from "./FicheMembre";

export const metadata: Metadata = { title: "Fiche membre" };

export default async function PageMembre({ params }: PageProps<"/membre/[id]">) {
  const { id } = await params;
  return (
    <Coquille>
      <FicheMembre id={id} />
    </Coquille>
  );
}
