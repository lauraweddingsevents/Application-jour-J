"use client";
import { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AffichageFiche } from "@/components/fiche/AffichageFiche";
import { Carte } from "@/components/ui/Carte";
import { Feuille } from "@/components/ui/Feuille";
import { FormulaireRetard } from "@/components/retard/FormulaireRetard";
import { supabaseAnonyme } from "@/lib/supabase/anonyme";
import { Logo } from "@/components/Logo";
import { dateLongue } from "@/lib/dates";
import { dureeLisible, estApresMinuit, heureAffichee } from "@/lib/heures";
import { nomMariage } from "@/lib/types";
import { finEffective, useMaintenant, useVue, type MomentVue, type Vue } from "@/lib/vue";

type Onglet = "miens" | "tout" | "infos";

export function VueIntervenant() {
  const { jeton } = useParams<{ jeton: string }>();
  const { etat, derniereMaj, effacerMaj, recharger } = useVue(jeton);

  if (etat.statut === "chargement")
    return <p className="mt-20 text-center text-encre-doux">Chargement de votre déroulé…</p>;
  if (etat.statut === "introuvable" || etat.statut === "erreur")
    return (
      <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <Logo taille="grand" />
        <h1 className="mt-8 text-xl font-medium">
          {etat.statut === "introuvable" ? "Ce lien n'est pas valide" : "Connexion impossible"}
        </h1>
        <p className="mt-3 text-encre-doux">
          {etat.statut === "introuvable"
            ? "Il a peut-être été supprimé. Contactez la personne qui vous l'a envoyé."
            : "Vérifiez votre connexion internet, puis rechargez la page."}
        </p>
      </main>
    );

  return (
    <Contenu
      vue={etat.vue}
      chargeLe={etat.chargeLe}
      horsLigne={etat.horsLigne}
      derniereMaj={derniereMaj}
      effacerMaj={effacerMaj}
      jeton={jeton}
      recharger={recharger}
    />
  );
}

function Contenu({
  vue,
  chargeLe,
  horsLigne,
  derniereMaj,
  effacerMaj,
  jeton,
  recharger,
}: {
  vue: Vue;
  chargeLe: number;
  horsLigne: boolean;
  derniereMaj: string[];
  effacerMaj: () => void;
  jeton: string;
  recharger: () => Promise<void>;
}) {
  const [onglet, setOnglet] = useState<Onglet>("miens");
  const [retard, setRetard] = useState<MomentVue | null>(null);
  const [annonce, setAnnonce] = useState("");
  const fermerRetard = useCallback(() => setRetard(null), []);
  // Les personnes avec l'accès coordination peuvent signaler un retard
  const coordination = vue.moi.acces_coordination;
  const surRetard = coordination && !horsLigne ? setRetard : undefined;
  const maintenant = useMaintenant();
  const tz = vue.mariage.fuseau_horaire;

  const moments = useMemo(
    () => [...vue.moments].sort((a, b) => a.debut.localeCompare(b.debut) || a.ordre - b.ordre),
    [vue.moments],
  );
  const miens = moments.filter((m) => m.intervenants.includes(vue.moi.id));
  const noms = useMemo(() => new Map(vue.intervenants.map((i) => [i.id, i.nom])), [vue.intervenants]);

  const enCours = moments.filter(
    (m) => new Date(m.debut).getTime() <= maintenant && maintenant < finEffective(m, moments),
  );
  const prochaineMission = miens.find((m) => new Date(m.debut).getTime() > maintenant);
  const termine = moments.length > 0 && maintenant >= finEffective(moments.at(-1)!, moments);
  const pasCommence = moments.length > 0 && maintenant < new Date(moments[0].debut).getTime();

  const changesMiens = derniereMaj.filter((id) => miens.some((m) => m.id === id));

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-10 pt-6">
      {horsLigne && (
        <div className="mb-4 rounded-2xl bg-encre px-4 py-3 text-sm text-blanc" role="status">
          📡 Pas de réseau : voici la dernière version enregistrée (mise à jour à{" "}
          {new Date(chargeLe).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}).
          Elle se mettra à jour toute seule au retour du réseau.
        </div>
      )}

      <header className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-or-fonce">Mariage de</p>
        <h1 className="mt-1 text-2xl font-medium">{nomMariage(vue.mariage)}</h1>
        <p className="mt-1 text-sm text-encre-doux first-letter:uppercase">
          {dateLongue(vue.mariage.date_mariage)}
          {vue.mariage.lieu_principal && ` · ${vue.mariage.lieu_principal}`}
        </p>
        <p className="mt-4 text-encre-doux">
          Bonjour <strong className="font-medium text-encre">{vue.moi.nom}</strong>
          {vue.moi.role && ` · ${vue.moi.role}`}
        </p>
      </header>

      {coordination && (
        <p className="mt-4 rounded-2xl bg-or/15 px-4 py-2.5 text-center text-sm text-or-fonce">
          🎯 Vous avez l&apos;accès coordination : touchez « ⏱ Retard » sur un moment pour décaler les horaires.
        </p>
      )}
      {annonce && (
        <p className="mt-4 rounded-2xl bg-succes/15 px-4 py-3 text-sm text-succes" role="status">
          {annonce}
        </p>
      )}

      {changesMiens.length > 0 && (
        <button
          type="button"
          onClick={effacerMaj}
          className="mt-5 w-full rounded-2xl bg-or px-4 py-3 text-left text-blanc shadow-sm"
          role="alert"
        >
          <span className="font-medium">⏰ Horaires mis à jour</span>
          <span className="block text-sm text-blanc/90">
            {changesMiens.length === 1 ? "Un de vos moments a changé" : `${changesMiens.length} de vos moments ont changé`}{" "}
            : vérifiez les heures ci-dessous. (Toucher pour masquer)
          </span>
        </button>
      )}

      {/* Le moment en cours et votre prochaine mission */}
      <section className="mt-6 flex flex-col gap-3" aria-label="En ce moment">
        {enCours.map((m) => (
          <EnAvant
            key={m.id}
            etiquette="En ce moment"
            moment={m}
            tz={tz}
            moi={m.intervenants.includes(vue.moi.id)}
            fin={finEffective(m, moments)}
            maintenant={maintenant}
            onRetard={surRetard}
          />
        ))}
        {prochaineMission && (
          <EnAvant
            etiquette="Votre prochaine mission"
            moment={prochaineMission}
            tz={tz}
            moi
            maintenant={maintenant}
            principal
            onRetard={surRetard}
          />
        )}
        {!prochaineMission && miens.length > 0 && !termine && enCours.length === 0 && (
          <Carte className="text-center text-encre-doux">Vos missions sont terminées. Merci ! 🤍</Carte>
        )}
        {termine && <Carte className="text-center text-encre-doux">La journée est terminée. Merci pour tout ! 🤍</Carte>}
        {pasCommence && !prochaineMission && (
          <Carte className="text-center text-encre-doux">
            Début de la journée à {heureAffichee(moments[0].debut, tz)}.
          </Carte>
        )}
      </section>

      <nav className="sticky top-0 z-10 -mx-4 mt-6 bg-creme/95 px-4 py-2 backdrop-blur" aria-label="Affichage">
        <div className="grid grid-cols-3 gap-1 rounded-full bg-creme-fonce p-1">
          {(
            [
              ["miens", "Mes moments"],
              ["tout", "Tout le déroulé"],
              ["infos", "Infos pratiques"],
            ] as [Onglet, string][]
          ).map(([id, texte]) => (
            <button
              key={id}
              type="button"
              aria-pressed={onglet === id}
              onClick={() => setOnglet(id)}
              className={`min-h-[44px] rounded-full px-1 text-[13px] font-medium leading-tight ${
                onglet === id ? "bg-blanc text-encre shadow-sm" : "text-encre-doux"
              }`}
            >
              {texte}
            </button>
          ))}
        </div>
      </nav>

      <div className="mt-4">
        {onglet === "infos" ? (
          vue.fiche.length ? (
            <AffichageFiche elements={vue.fiche} />
          ) : (
            <Carte className="text-center text-encre-doux">Aucune information pratique pour l&apos;instant.</Carte>
          )
        ) : (
          <ListeMoments
            moments={onglet === "miens" ? miens : moments}
            tous={moments}
            moiId={vue.moi.id}
            noms={noms}
            tz={tz}
            dateMariage={vue.mariage.date_mariage}
            maintenant={maintenant}
            changes={derniereMaj}
            surligner={onglet === "tout"}
            onRetard={surRetard}
          />
        )}
        {onglet === "miens" && miens.length === 0 && (
          <Carte className="text-center text-encre-doux">
            Aucun moment ne vous est encore attribué. Consultez « Tout le déroulé ».
          </Carte>
        )}
      </div>

      {coordination && (
        <Feuille titre="Signaler un retard" ouverte={retard !== null} onFermer={fermerRetard}>
          {retard && (
            <FormulaireRetard
              moment={retard}
              moments={moments}
              tz={tz}
              onValider={async (minutes, suivants) => {
                const { data, error } = await supabaseAnonyme().rpc("decaler_moments", {
                  p_moment: retard.id,
                  p_minutes: minutes,
                  p_suivants: suivants,
                  p_jeton: jeton,
                });
                if (error) throw error;
                await recharger();
                effacerMaj(); // inutile d'afficher « Horaires mis à jour » à l'auteur du changement
                fermerRetard();
                setAnnonce(`✓ ${data} moment${data > 1 ? "s" : ""} décalé${data > 1 ? "s" : ""}. Tout le monde voit les nouveaux horaires.`);
                setTimeout(() => setAnnonce(""), 6000);
              }}
            />
          )}
        </Feuille>
      )}

      <p className="mt-10 text-center text-xs text-encre-doux">
        Ce lien est personnel : merci de ne pas le partager.
        <br />
        Mis à jour en temps réel · Ma Coordo
      </p>
    </main>
  );
}

function dansCombien(ms: number) {
  const min = Math.round(ms / 60_000);
  if (min <= 0) return "maintenant";
  if (min < 60) return `dans ${min} min`;
  return `dans ${dureeLisible(min)}`;
}

function EnAvant({
  etiquette,
  moment,
  tz,
  moi,
  fin,
  maintenant,
  principal,
  onRetard,
}: {
  etiquette: string;
  moment: MomentVue;
  tz: string;
  moi: boolean;
  fin?: number;
  maintenant: number;
  principal?: boolean;
  onRetard?: (m: MomentVue) => void;
}) {
  const debut = new Date(moment.debut).getTime();
  return (
    <div
      className={`rounded-carte p-5 shadow-sm ${
        principal ? "bg-encre text-blanc" : "bg-blanc ring-2 ring-or"
      }`}
    >
      <p className={`text-xs font-medium uppercase tracking-wider ${principal ? "text-or-clair" : "text-or-fonce"}`}>
        {etiquette}
        {!principal && moi && " · vous êtes concerné·e"}
      </p>
      <p className="mt-2 text-xl font-medium">{moment.titre}</p>
      <p className={`mt-1 ${principal ? "text-blanc/85" : "text-encre-doux"}`}>
        {heureAffichee(moment.debut, tz)}
        {moment.fin && ` – ${heureAffichee(moment.fin, tz)}`}
        {moment.lieu && ` · 📍 ${moment.lieu}`}
      </p>
      <p className={`mt-2 text-sm font-medium ${principal ? "text-or-clair" : "text-or-fonce"}`}>
        {fin
          ? `Se termine ${dansCombien(fin - maintenant)}`
          : `Commence ${dansCombien(debut - maintenant)}`}
      </p>
      {moment.notes && (
        <p className={`mt-2 whitespace-pre-line text-sm ${principal ? "text-blanc/85" : "text-encre-doux"}`}>
          {moment.notes}
        </p>
      )}
      {onRetard && (
        <button
          type="button"
          onClick={() => onRetard(moment)}
          className={`mt-4 min-h-[48px] w-full rounded-full text-sm font-medium ${
            principal ? "bg-blanc text-encre" : "bg-or text-blanc"
          }`}
        >
          ⏱ Signaler un retard
        </button>
      )}
    </div>
  );
}

function ListeMoments({
  moments,
  tous,
  moiId,
  noms,
  tz,
  dateMariage,
  maintenant,
  changes,
  surligner,
  onRetard,
}: {
  onRetard?: (m: MomentVue) => void;
  moments: MomentVue[];
  tous: MomentVue[];
  moiId: string;
  noms: Map<string, string>;
  tz: string;
  dateMariage: string;
  maintenant: number;
  changes: string[];
  surligner: boolean;
}) {
  return (
    <ol className="flex flex-col gap-2">
      {moments.map((m, i) => {
        const passe = finEffective(m, tous) <= maintenant;
        const enCours = !passe && new Date(m.debut).getTime() <= maintenant;
        const moi = m.intervenants.includes(moiId);
        const nuit = estApresMinuit(m.debut, dateMariage, tz);
        const nuitAvant = i > 0 && estApresMinuit(moments[i - 1].debut, dateMariage, tz);
        const autres = m.intervenants.filter((id) => id !== moiId).map((id) => noms.get(id)).filter(Boolean);
        return (
          <li key={m.id}>
            {nuit && !nuitAvant && (
              <p className="my-2 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-encre-doux">
                <span className="h-px flex-1 bg-or-clair" /> 🌙 Après minuit <span className="h-px flex-1 bg-or-clair" />
              </p>
            )}
            <Carte
              className={`flex gap-4 py-4 ${passe ? "opacity-50" : ""} ${
                enCours ? "ring-2 ring-or" : surligner && moi ? "ring-2 ring-or-clair" : ""
              }`}
            >
              <div className="w-14 shrink-0 text-right">
                <p className="text-lg font-medium leading-tight">{heureAffichee(m.debut, tz)}</p>
                {m.fin && <p className="text-xs text-encre-doux">{heureAffichee(m.fin, tz)}</p>}
              </div>
              <div className="min-w-0 flex-1 border-l border-or-clair pl-4">
                <p className="font-medium">
                  {m.titre}
                  {changes.includes(m.id) && (
                    <span className="ml-2 rounded-full bg-or px-2 py-0.5 align-middle text-[11px] text-blanc">
                      Nouvel horaire
                    </span>
                  )}
                </p>
                {m.lieu && <p className="mt-0.5 text-sm text-encre-doux">📍 {m.lieu}</p>}
                {surligner && moi && <p className="mt-1 text-xs font-medium text-or-fonce">★ Vous êtes concerné·e</p>}
                {m.notes && (moi || !surligner) && (
                  <p className="mt-1.5 whitespace-pre-line text-sm text-encre-doux">{m.notes}</p>
                )}
                {autres.length > 0 && (
                  <p className="mt-1.5 text-xs text-encre-doux">
                    {moi ? "Avec " : ""}
                    {autres.join(", ")}
                  </p>
                )}
                {passe && <p className="mt-1 text-xs text-encre-doux">Terminé</p>}
                {onRetard && !passe && (
                  <button
                    type="button"
                    onClick={() => onRetard(m)}
                    className="mt-2 min-h-[40px] rounded-full px-4 text-xs font-medium text-or-fonce ring-1 ring-or-clair"
                  >
                    ⏱ Retard
                  </button>
                )}
              </div>
            </Carte>
          </li>
        );
      })}
    </ol>
  );
}
