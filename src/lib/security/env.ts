/** Production = Vercel deploy or `next start` after build. */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isVercel(): boolean {
  return Boolean(process.env.VERCEL);
}
