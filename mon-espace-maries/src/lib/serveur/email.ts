import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { CONFIG } from "./config";
import type { Langue } from "@/lib/calculs";

export type Message = {
  sujet: string;
  titre: string;
  paragraphes: string[];
  bouton?: { texte: string; url: string };
  boutons?: { texte: string; url: string }[];
  langue?: Langue;
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

const echapper = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Mise en page de la charte : beige, bordeaux, titres en Cormorant
export function html(m: Message) {
  const bouton = (b: { texte: string; url: string }, principal: boolean) =>
    `<p style="margin:16px 0 0"><a href="${echapper(b.url)}" style="display:inline-block;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:600;font-family:Helvetica,Arial,sans-serif;font-size:15px;${
      principal ? "background:#6B1E2E;color:#F5EEE4" : "background:#FFFDF9;color:#6B1E2E;border:1.5px solid #6B1E2E"
    }">${echapper(b.texte)}</a></p>`;
  const tous = [...(m.bouton ? [m.bouton] : []), ...(m.boutons ?? [])];
  const pied = m.langue === "en"
    ? "You are receiving this email because Laura Weddings &amp; Events is organising your wedding."
    : "Vous recevez cet e-mail car Laura Weddings &amp; Events accompagne votre mariage.";
  return `<!doctype html><html lang="${m.langue ?? "fr"}"><body style="margin:0;background:#F5EEE4;color:#2B1D1F">
<div style="max-width:520px;margin:0 auto;padding:28px 18px">
<p style="text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6B1E2E;font-weight:600;margin:0 0 18px">Laura Weddings &amp; Events</p>
<div style="background:#FFFDF9;border:1px solid #E6DCCE;border-radius:18px;padding:26px 22px">
<h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;font-weight:600;margin:0 0 14px;line-height:1.2">${echapper(m.titre)}</h1>
${m.paragraphes.map((p) => `<p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;margin:0 0 10px;white-space:pre-line">${echapper(p)}</p>`).join("")}
${tous.map((b, i) => bouton(b, i === 0)).join("")}
</div>
<p style="text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#6E5F5A;margin:18px 0 0;line-height:1.5">${pied}</p>
</div></body></html>`;
}

function texte(m: Message) {
  const tous = [...(m.bouton ? [m.bouton] : []), ...(m.boutons ?? [])];
  return [m.titre, "", ...m.paragraphes, "", ...tous.map((b) => `${b.texte} : ${b.url}`)].join("\n").trim();
}

export async function envoyerEmail(destinataire: string, m: Message) {
  if (!emailConfigure() || !destinataire) return false;
  await transporteur().sendMail({ from: CONFIG.smtp.expediteur, to: destinataire, subject: m.sujet, text: texte(m), html: html(m) });
  return true;
}
