"use client";

const NETWORK = "Connexion impossible avec le serveur. Rien n'a été enregistré : vérifiez votre connexion puis réessayez.";

/**
 * Appelle une action serveur sans jamais faire planter l'interface :
 * une coupure réseau devient un résultat d'échec affichable.
 */
export async function safeAction<T extends { ok: boolean }>(fn: () => Promise<T>): Promise<T | { ok: false; error: string; message: string }> {
  try {
    return await fn();
  } catch {
    return { ok: false, error: NETWORK, message: NETWORK };
  }
}
