"use client";
import { useEffect, useState } from "react";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";

// Texte de la charte, tel que rédigé par l'administration
export function TexteCharte({ onVersion }: { onVersion?: (v: number) => void }) {
  const [texte, setTexte] = useState<string | null>(null);

  useEffect(() => {
    supabaseNavigateur()
      .from("charte")
      .select("texte, version")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        setTexte(data?.texte ?? "");
        if (data) onVersion?.(data.version);
      });
  }, [onVersion]);

  if (texte === null) return <p className="text-encre-doux">Chargement de la charte…</p>;
  return <div className="whitespace-pre-line leading-relaxed">{texte}</div>;
}
