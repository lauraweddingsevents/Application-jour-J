import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { CONFIG } from "./config";

export type Message = {
  sujet: string;
  titre: string;
  paragraphes: string[];
  bouton?: { texte: string; url: string };
  boutonSecondaire?: { texte: string; url: string };
};

let transport: Transporter | null = null;
function transporteur() {
  transport ??= nodemailer.createTransport({
    host: CONFIG.smtp.hote,
    port: CONFIG.smtp.port,
    secure: CONFIG.smtp.port === 465,
    auth: { user: CONFIG.smtp.utilisateur, pass: CONFIG.smtp.motDePasse },
  });
  return transport;
}

export function emailConfigure() {
  return Boolean(CONFIG.smtp.utilisateur && CONFIG.smtp.motDePasse);
}

const echapper = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Mise en page sobre, tons beiges, lisible sur téléphone
export function html(m: Message) {
  const bouton = (b: { texte: string; url: string }, principal: boolean) =>
    `<p style="margin:24px 0 0"><a href="${echapper(b.url)}" style="display:inline-block;padding:14px 26px;border-radius:999px;text-decoration:none;font-weight:600;${
      principal ? "background:#a07e5e;color:#fffdfa" : "background:#fffdfa;color:#3b3330;border:1px solid #d9c6b1"
    }">${echapper(b.texte)}</a></p>`;
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f4ede4;font-family:Helvetica,Arial,sans-serif;color:#3b3330">
<div style="max-width:520px;margin:0 auto;padding:28px 18px">
<p style="text-align:center;font-size:18px;letter-spacing:.08em;font-weight:300;margin:0 0 20px">Mon Relais <span style="color:#86684b">Presta</span></p>
<div style="background:#fffdfa;border-radius:20px;padding:26px 22px">
<h1 style="font-size:20px;font-weight:500;margin:0 0 14px;line-height:1.35">${echapper(m.titre)}</h1>
${m.paragraphes.map((p) => `<p style="font-size:16px;line-height:1.55;margin:0 0 10px;white-space:pre-line">${echapper(p)}</p>`).join("")}
${m.bouton ? bouton(m.bouton, true) : ""}${m.boutonSecondaire ? bouton(m.boutonSecondaire, false) : ""}
</div>
<p style="text-align:center;font-size:12px;color:#6e625c;margin:18px 0 0;line-height:1.5">Wedding Presta Club · Wedding Social Hub<br>
Vous recevez cet e-mail en tant que membre. Pour ne plus en recevoir : <a href="${CONFIG.site}/profil" style="color:#86684b">Mon profil</a>.</p>
</div></body></html>`;
}

function texte(m: Message) {
  return [m.titre, "", ...m.paragraphes, "", m.bouton ? `${m.bouton.texte} : ${m.bouton.url}` : "", m.boutonSecondaire ? `${m.boutonSecondaire.texte} : ${m.boutonSecondaire.url}` : ""]
    .join("\n")
    .trim();
}

// Un destinataire, ou plusieurs en copie cachée (diffusion d'une nouvelle demande)
export async function envoyerEmail(destinataires: string[], m: Message) {
  if (!emailConfigure() || destinataires.length === 0) return;
  const unique = destinataires.length === 1;
  await transporteur().sendMail({
    from: CONFIG.smtp.expediteur,
    to: unique ? destinataires[0] : CONFIG.smtp.expediteur,
    bcc: unique ? undefined : destinataires,
    subject: m.sujet,
    text: texte(m),
    html: html(m),
  });
}
