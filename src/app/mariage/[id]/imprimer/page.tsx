import type { Metadata } from "next";
import { Suspense } from "react";
import { VersionImprimable } from "./VersionImprimable";

export const metadata: Metadata = { title: "Version imprimable" };

export default function Page() {
  return (
    <Suspense fallback={<p className="mt-20 text-center text-encre-doux">Chargement…</p>}>
      <VersionImprimable />
    </Suspense>
  );
}
