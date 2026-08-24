export function getBackendOrigin(): string | null {
  const raw =
    process.env.ROMADE_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "";

  return raw ? raw.replace(/\/$/, "") : null;
}
