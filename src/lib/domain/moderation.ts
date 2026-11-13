export const MODERATOR_USERNAME = 'destructor_harsh';

export function isModerator(username: string | null | undefined): boolean {
  return username === MODERATOR_USERNAME;
}
