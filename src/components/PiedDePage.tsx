import Link from "next/link";

export function PiedDePage() {
  return (
    <footer className="mt-auto px-4 py-8 text-center text-sm text-encre-doux">
      <p>
        Ma Coordo · une création{" "}
        <span className="text-or-fonce">Laura Weddings &amp; Events</span>
      </p>
      <p className="mt-2">
        <Link href="/aide" className="underline underline-offset-4">
          Aide
        </Link>
        {" · "}
        <Link href="/mentions-legales" className="underline underline-offset-4">
          Mentions légales et confidentialité
        </Link>
      </p>
    </footer>
  );
}
