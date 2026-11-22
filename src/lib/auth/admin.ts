export const DEFAULT_ADMIN_EMAILS = ['maddalaharshvardhan@gmail.com'];

export function parseAdminEmails(rawAdminEmails: string): string[] {
  return rawAdminEmails
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

export function resolveAdminEmails(rawAdminEmails: string | undefined): string[] {
  return rawAdminEmails === undefined ? DEFAULT_ADMIN_EMAILS : parseAdminEmails(rawAdminEmails);
}

export function isAppAdmin(
  user: { email?: string | null } | null | undefined,
  rawAdminEmails: string | undefined = process.env.APP_ADMIN_EMAILS
): boolean {
  const email = user?.email?.trim().toLowerCase();
  if (!email) return false;
  return resolveAdminEmails(rawAdminEmails).includes(email);
}
