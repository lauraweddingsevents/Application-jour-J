import type { Metadata } from "next";
import { Suspense } from "react";
import { EspaceMariage } from "./EspaceMariage";

export const metadata: Metadata = { title: "Mariage" };

export default function PageMariage() {
  return (
    <Suspense fallback={<p className="mt-20 text-center text-encre-doux">Chargement…</p>}>
      <EspaceMariage />
    </Suspense>
  );
}
