import type { Metadata } from "next";
import { Inscription } from "./Inscription";

export const metadata: Metadata = { title: "Inscription" };

export default function PageInscription() {
  return <Inscription />;
}
