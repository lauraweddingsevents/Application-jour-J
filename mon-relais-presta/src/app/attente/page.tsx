import type { Metadata } from "next";
import { Attente } from "./Attente";

export const metadata: Metadata = { title: "Inscription en attente" };

export default function PageAttente() {
  return <Attente />;
}
