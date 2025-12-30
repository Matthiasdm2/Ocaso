// guard.ts
export function assertAdmin(profile: { is_admin?: boolean } | null) {
  if (!profile?.is_admin) {
    const err = new Error("Forbidden: admin only");
    // @ts-expect-error add status
    err.status = 403;
    throw err;
  }
}
