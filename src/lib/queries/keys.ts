export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

export const matchKeys = {
  all: ['matches'] as const,
  list: () => [...matchKeys.all, 'list'] as const,
  detail: (id: string) => [...matchKeys.all, id] as const,
  state: (id: string) => [...matchKeys.all, id, 'state'] as const,
  rounds: (id: string) => [...matchKeys.all, id, 'rounds'] as const,
  joinRequests: (id: string) => [...matchKeys.all, id, 'join-requests'] as const,
};

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
};

export const friendKeys = {
  all: ['friends'] as const,
  list: () => [...friendKeys.all, 'list'] as const,
  requests: () => [...friendKeys.all, 'requests'] as const,
};

export const userKeys = {
  all: ['users'] as const,
  me: () => [...userKeys.all, 'me'] as const,
  detail: (username: string) => [...userKeys.all, username] as const,
  stats: (username: string) => [...userKeys.all, username, 'stats'] as const,
  search: (term: string) => [...userKeys.all, 'search', term] as const,
};

export const joinKeys = {
  all: ['join'] as const,
  validate: (code: string) => [...joinKeys.all, 'validate', code] as const,
  confirm: (code: string) => [...joinKeys.all, 'confirm', code] as const,
};
