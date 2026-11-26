// Demande au serveur d'envoyer tout de suite les notifications en attente (e-mail, téléphone).
// Sans bloquer l'écran : la tâche horaire rattrape tout envoi manqué.
export function notifierServeur() {
  fetch("/api/notifier", { method: "POST", keepalive: true }).catch(() => {});
}
