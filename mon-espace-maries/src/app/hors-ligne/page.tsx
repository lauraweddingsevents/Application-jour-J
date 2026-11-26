// Page affichée par le téléphone quand il n'y a pas de réseau
export default function HorsLigne() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <p className="font-titre text-3xl font-semibold">Pas de connexion</p>
      <p className="text-sm text-doux">Vérifiez votre réseau, puis réessayez. · Please check your connection and try again.</p>
    </main>
  );
}
