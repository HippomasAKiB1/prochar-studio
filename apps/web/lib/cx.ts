/** Join truthy class fragments. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Build a long class string from readable fragments. */
export function cls(...parts: string[]): string {
  return parts.join(" ");
}
