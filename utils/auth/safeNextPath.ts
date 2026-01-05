// fonction pour sécuriser le paramètre "next" dans les URLs de redirection après login, n’accepte que des paths internes.

export function safeNextPath(next: string | null | undefined): string {
  if (!next) return "/";

  // Decode au cas où c’est encodé plusieurs fois
  let value = next;
  try {
    value = decodeURIComponent(next);
  } catch {
    // ignore
  }

  // N’accepte que des paths internes
  // - doit commencer par "/"
  // - refuse "//" (protocole-relative)
  // - refuse "\"
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/";
  }

  return value;
}
