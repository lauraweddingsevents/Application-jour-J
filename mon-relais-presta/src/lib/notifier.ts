// Demande au serveur d'envoyer tout de suite les notifications en attente
// (sans bloquer l'écran ; la tâche horaire rattrape tout envoi manqué)
export function notifier() {
  fetch("/api/notifier", { method: "POST", keepalive: true }).catch(() => {});
}
