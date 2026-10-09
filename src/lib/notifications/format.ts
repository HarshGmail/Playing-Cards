export interface FormattableNotification {
  type: string;
  payload: Record<string, unknown>;
}

export interface FormattedNotification {
  title: string;
  body: string;
  url: string;
}

export const NOTIFICATIONS_URL = '/notifications';
export const PROFILE_URL = '/profile';
export const DASHBOARD_URL = '/dashboard';
export const CELEBRATE_QUERY = 'celebrate=1';
export const MILESTONES_URL = `${PROFILE_URL}#milestones`;

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function matchUrl(payload: Record<string, unknown>, query = ''): string {
  const matchId = text(payload.matchId);
  if (!matchId) return NOTIFICATIONS_URL;
  return query ? `/matches/${matchId}?${query}` : `/matches/${matchId}`;
}

export function formatRatingDelta(ratingDelta: unknown): string {
  if (typeof ratingDelta !== 'number' || !Number.isFinite(ratingDelta)) return '';
  const rounded = Math.round(ratingDelta);
  return `${rounded > 0 ? '+' : ''}${rounded} rating`;
}

function profileUrl(username: unknown): string {
  const handle = text(username);
  return handle ? `${PROFILE_URL}/${handle}` : PROFILE_URL;
}

function formatMatchWon(payload: Record<string, unknown>): FormattedNotification {
  const matchName = text(payload.matchName) || 'the match';
  const delta = formatRatingDelta(payload.ratingDelta);
  return {
    title: 'Match won',
    body: delta ? `You won ${matchName}! 🏆 ${delta}` : `You won ${matchName}! 🏆`,
    url: matchUrl(payload, CELEBRATE_QUERY),
  };
}

function formatMilestone(payload: Record<string, unknown>): FormattedNotification {
  const headline = [text(payload.emoji), text(payload.title) || 'New milestone']
    .filter(Boolean)
    .join(' ');
  return { title: 'Milestone unlocked', body: headline, url: MILESTONES_URL };
}

function formatRoundScored(payload: Record<string, unknown>): FormattedNotification {
  const verb = payload.edited ? 'corrected' : 'scored';
  const scorer = text(payload.scoredByName) || 'The scorer';
  const matchName = text(payload.matchName) || 'a match';
  const base = `${scorer} ${verb} round ${payload.round} in ${matchName}`;
  const body = typeof payload.yourScore === 'number' ? `${base} — you got ${payload.yourScore}` : base;
  return {
    title: payload.edited ? `Round ${payload.round} corrected` : `Round ${payload.round} scored`,
    body,
    url: matchUrl(payload),
  };
}

export function formatNotification(notification: FormattableNotification): FormattedNotification {
  const p = notification.payload;
  const matchName = text(p.matchName) || 'a match';

  switch (notification.type) {
    case 'friend-request':
      return {
        title: 'Friend request',
        body: `${text(p.fromUserName) || 'Someone'} sent you a friend request`,
        url: profileUrl(p.fromUsername),
      };
    case 'friend-accepted':
      return {
        title: 'Friend request accepted',
        body: `${text(p.toUserName) || 'Someone'} accepted your friend request`,
        url: profileUrl(p.toUsername),
      };
    case 'join-request':
      return {
        title: 'Join request',
        body: `${text(p.userName) || 'Someone'} requested to join ${matchName}`,
        url: matchUrl(p),
      };
    case 'join-approved':
      return {
        title: 'Join approved',
        body: `You were approved to join ${matchName}`,
        url: matchUrl(p),
      };
    case 'join-declined':
      return {
        title: 'Join declined',
        body: `Your request to join ${matchName} was declined`,
        url: DASHBOARD_URL,
      };
    case 'added-to-match':
      return p.role === 'spectator'
        ? {
            title: 'Added as spectator',
            body: `${text(p.invitedByName) || 'Someone'} added you as a spectator of ${matchName}`,
            url: matchUrl(p),
          }
        : {
            title: 'Added to a match',
            body: `You were added to ${matchName}`,
            url: matchUrl(p),
          };
    case 'match-ended':
      return { title: 'Match ended', body: `${matchName} has ended`, url: matchUrl(p) };
    case 'match-invite':
      return {
        title: 'Match invite',
        body: `${text(p.invitedByName) || 'Someone'} invited you to play ${matchName}`,
        url: NOTIFICATIONS_URL,
      };
    case 'match-invite-accepted':
      return {
        title: 'Invite accepted',
        body: `${text(p.userName) || 'A player'} accepted your invite to ${matchName}`,
        url: matchUrl(p),
      };
    case 'match-invite-declined':
      return {
        title: 'Invite declined',
        body: `${text(p.userName) || 'A player'} declined your invite to ${matchName}`,
        url: matchUrl(p),
      };
    case 'round-scored':
      return formatRoundScored(p);
    case 'match-won':
      return formatMatchWon(p);
    case 'milestone':
      return formatMilestone(p);
    default:
      return { title: 'Notification', body: 'New notification', url: NOTIFICATIONS_URL };
  }
}
