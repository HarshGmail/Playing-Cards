import {
  Bell,
  Calculator,
  Flag,
  LogIn,
  Mail,
  Trophy,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { NotificationType } from '@/types';

export interface NotificationAppearance {
  icon: LucideIcon;
  iconClass: string;
  cardClass: string;
  unreadCardClass: string;
}

const READ_CARD_CLASS = 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';

function tone(iconClass: string, unreadCardClass: string, cardClass = READ_CARD_CLASS): Omit<NotificationAppearance, 'icon'> {
  return { iconClass, cardClass, unreadCardClass };
}

const VIOLET = tone(
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700'
);
const GREEN = tone(
  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
);
const RED = tone(
  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
);
const BLUE = tone(
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
);
const SLATE = tone(
  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
);
const GOLD = tone(
  'bg-amber-200 text-amber-800 dark:bg-amber-500/30 dark:text-amber-200',
  'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/10 border-amber-400 dark:border-amber-600',
  'bg-gradient-to-r from-amber-50/60 to-yellow-50/40 dark:from-amber-900/15 dark:to-yellow-900/5 border-amber-200 dark:border-amber-800'
);

const APPEARANCE_BY_TYPE: Record<NotificationType, NotificationAppearance> = {
  'friend-request': { icon: UserPlus, ...BLUE },
  'friend-accepted': { icon: UserCheck, ...GREEN },
  'join-request': { icon: LogIn, ...BLUE },
  'join-approved': { icon: UserCheck, ...GREEN },
  'join-declined': { icon: UserX, ...RED },
  'added-to-match': { icon: Users, ...VIOLET },
  'match-ended': { icon: Flag, ...SLATE },
  'match-invite': { icon: Mail, ...VIOLET },
  'match-invite-accepted': { icon: UserCheck, ...GREEN },
  'match-invite-declined': { icon: UserX, ...RED },
  'round-scored': { icon: Calculator, ...SLATE },
  'match-won': { icon: Trophy, ...GOLD },
};

const FALLBACK_APPEARANCE: NotificationAppearance = { icon: Bell, ...SLATE };

export function appearanceFor(type: string): NotificationAppearance {
  return APPEARANCE_BY_TYPE[type as NotificationType] ?? FALLBACK_APPEARANCE;
}
