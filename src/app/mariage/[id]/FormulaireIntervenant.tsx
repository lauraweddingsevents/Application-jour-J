"use client";
import { useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { Champ } from "@/components/ui/Champ";
import { Choix } from "@/components/ui/Choix";
import { messageErreur } from "@/lib/erreurs";
import { ROLES_PRESTATAIRES, ROLES_PROCHES, categoriePourRole } from "@/lib/roles";
import type { IntervenantSaisi } from "@/lib/donnees";
import type { Categorie } from "@/lib/types";
import { VUES_PLAN, texteVue, vuePlanAuto, type VuePlan } from "@/lib/vuesPlan";

const VIDE: IntervenantSaisi = {
  nom: "",
  role: "",
  categorie: "prestataire",
  telephone: "",
  email: "",
  acces_coordination: false,
};

export function FormulaireIntervenant({
  initial,
  onEnregistrer,
  onSupprimer,
}: {
  initial?: IntervenantSaisi;
  onEnregistrer: (i: IntervenantSaisi) => Promise<void>;
  onSupprimer?: () => Promise<void>;
}) {
  const [i, setI] = useState<IntervenantSaisi>(initial ?? VIDE);
  const [categorieChoisie, setCategorieChoisie] = useState(Boolean(initial));
  const [enCours, setEnCours] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState("");

  const maj = <K extends keyof IntervenantSaisi>(cle: K, v: IntervenantSaisi[K]) =>
    setI((avant) => ({ ...avant, [cle]: v }));

  function changerRole(role: string) {
    maj("role", role);
    // Catégorie devinée automatiquement, tant qu'on ne l'a pas choisie soi-même
    const devinee = categoriePourRole(role);
    if (devinee && !categorieChoisie) maj("categorie", devinee);
  }

  async function agir(action: () => Promise<void>) {
    setErreur("");
    setEnCours(true);
    try {
      await action();
    } catch (e) {
      setErreur(messageErreur(e as Error));
      setEnCours(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        agir(() =>
          onEnregistrer({
            ...i,
            nom: i.nom.trim(),
            role: i.role?.trim() || null,
            telephone: i.telephone?.trim() || null,
            email: i.email?.trim() || null,
          }),
        );
      }}
      className="flex flex-col gap-4"
    >
      <Champ
        id="nom"
        libelle="Nom"
        placeholder="Sophie Martin, ou Studio Lumière"
        value={i.nom}
        onChange={(e) => maj("nom", e.target.value)}
        required
        autoComplete="off"
      />
      <Champ
        id="role"
        libelle="Rôle"
        placeholder="Photographe, Témoin…"
        list="roles-suggeres"
        value={i.role ?? ""}
        onChange={(e) => changerRole(e.target.value)}
        autoComplete="off"
      />
      <datalist id="roles-suggeres">
        {[...ROLES_PRESTATAIRES, ...ROLES_PROCHES].map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      <Choix<Categorie>
        libelle="Catégorie"
        valeur={i.categorie}
        onChange={(c) => {
          setCategorieChoisie(true);
          maj("categorie", c);
        }}
        options={[
          { valeur: "prestataire", texte: "Prestataire" },
          { valeur: "proche", texte: "Proche" },
        ]}
      />

      <Champ
        id="tel"
        libelle="Téléphone (facultatif)"
        type="tel"
        inputMode="tel"
        placeholder="06 12 34 56 78"
        value={i.telephone ?? ""}
        onChange={(e) => maj("telephone", e.target.value)}
        autoComplete="off"
      />
      <Champ
        id="mail"
        libelle="E-mail (facultatif)"
        type="email"
        inputMode="email"
        placeholder="sophie@exemple.fr"
        value={i.email ?? ""}
        onChange={(e) => maj("email", e.target.value)}
        autoComplete="off"
      />
      <p className="-mt-2 text-xs text-encre-doux">
        🔒 Le téléphone et l&apos;e-mail ne sont visibles que par vous.
      </p>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-blanc p-4 ring-1 ring-or-clair/60">
        <input
          type="checkbox"
          checked={i.acces_coordination}
          onChange={(e) => maj("acces_coordination", e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 accent-[#A07E5E]"
        />
        <span>
          <span className="block font-medium">Accès coordination</span>
          <span className="block text-sm text-encre-doux">
            Son lien lui permettra de décaler les horaires en cas de retard
            (par exemple pour une assistante ou un témoin de confiance).
          </span>
        </span>
      </label>

      <label className="flex flex-col gap-1.5" htmlFor="vuePlan">
        <span className="font-medium">Plan de salle dans son lien</span>
        <select
          id="vuePlan"
          value={i.vue_plan ?? ""}
          onChange={(e) => maj("vue_plan", (e.target.value || null) as VuePlan | null)}
          className="min-h-[52px] rounded-2xl bg-blanc px-4 ring-1 ring-or-clair focus:outline-none focus:ring-2 focus:ring-or"
        >
          <option value="">
            Automatique : {texteVue(vuePlanAuto(i.role, i.categorie, i.acces_coordination))}
          </option>
          {VUES_PLAN.map((v) => (
            <option key={v.valeur} value={v.valeur}>
              {v.texte}
            </option>
          ))}
        </select>
        <span className="text-sm text-encre-doux">
          {VUES_PLAN.find((v) => v.valeur === (i.vue_plan ?? vuePlanAuto(i.role, i.categorie, i.acces_coordination)))?.detail}
        </span>
      </label>

      {erreur && <p className="text-sm text-alerte">{erreur}</p>}

      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : initial ? "Enregistrer" : "Ajouter l'intervenant"}
      </Bouton>

      {onSupprimer &&
        (!confirmer ? (
          <Bouton type="button" variante="secondaire" className="mt-2 !border-alerte/40 text-alerte" onClick={() => setConfirmer(true)}>
            🗑 Supprimer l&apos;intervenant et son lien
          </Bouton>
        ) : (
          <div className="mt-2 flex flex-col gap-2 rounded-2xl bg-blanc p-4 text-center ring-2 ring-alerte/40">
            <p className="text-sm">
              Supprimer <strong>{i.nom || "cet intervenant"}</strong> définitivement ?
            </p>
            <p className="text-sm text-encre-doux">
              Son lien ne fonctionnera plus, immédiatement, et il sera retiré de tous les moments du déroulé.
            </p>
            <Bouton type="button" variante="danger" disabled={enCours} onClick={() => agir(onSupprimer)}>
              Oui, supprimer
            </Bouton>
            <Bouton type="button" variante="discret" onClick={() => setConfirmer(false)}>
              Annuler
            </Bouton>
          </div>
        ))}
    </form>
  );
}
