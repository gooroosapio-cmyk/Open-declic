"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; message?: string; email?: string };

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

function safeNext(v: FormDataEntryValue | null): string {
  const s = typeof v === "string" ? v : "/";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

function translate(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou mot de passe incorrect.";
  if (m.includes("email not confirmed")) return "Votre e-mail n'est pas encore confirmé. Ouvrez le lien reçu par e-mail.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Un compte existe déjà avec cet e-mail.";
  if (m.includes("password should be")) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (m.includes("rate limit")) return "Trop de tentatives. Patientez quelques minutes puis réessayez.";
  if (m.includes("fetch failed") || m.includes("network")) return "Le service de connexion est injoignable. Réessayez plus tard.";
  return "L'opération a échoué. Réessayez.";
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Renseignez votre e-mail et votre mot de passe.", email };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: translate(error.message), email };
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email.includes("@")) return { error: "Adresse e-mail invalide.", email };
  if (password.length < 8) return { error: "Le mot de passe doit contenir au moins 8 caractères.", email };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl()}/auth/confirm?next=/` },
  });
  if (error) return { error: translate(error.message), email };
  // Supabase ne révèle pas si l'e-mail existe déjà (identities vide) : message neutre.
  if (data.session) redirect("/");
  return { message: "Compte créé. Ouvrez le lien de confirmation envoyé à votre adresse e-mail pour activer votre compte.", email };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim();
  if (!email.includes("@")) return { error: "Adresse e-mail invalide.", email };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/compte/mot-de-passe`,
  });
  if (error) return { error: translate(error.message), email };
  return { message: "Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.", email };
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: translate(error.message) };
  return { message: "Mot de passe modifié." };
}
