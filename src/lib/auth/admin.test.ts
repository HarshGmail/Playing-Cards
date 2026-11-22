import { describe, it, expect } from 'vitest';
import { DEFAULT_ADMIN_EMAILS, isAppAdmin, parseAdminEmails, resolveAdminEmails } from './admin';

const OWNER_EMAIL = 'maddalaharshvardhan@gmail.com';

describe('parseAdminEmails', () => {
  it('splits on commas, trims and lowercases', () => {
    expect(parseAdminEmails(' A@x.com ,B@Y.com,, ')).toEqual(['a@x.com', 'b@y.com']);
  });

  it('returns nothing for a blank value', () => {
    expect(parseAdminEmails('   ')).toEqual([]);
  });
});

describe('resolveAdminEmails', () => {
  it('falls back to the built-in default when the variable is unset', () => {
    expect(resolveAdminEmails(undefined)).toEqual(DEFAULT_ADMIN_EMAILS);
  });

  it('uses the variable instead of the default when it is set', () => {
    expect(resolveAdminEmails('a@x.com')).toEqual(['a@x.com']);
  });
});

describe('isAppAdmin', () => {
  it('recognises the default owner when the variable is unset', () => {
    expect(isAppAdmin({ email: OWNER_EMAIL }, undefined)).toBe(true);
  });

  it('matches case-insensitively and ignores surrounding whitespace', () => {
    expect(isAppAdmin({ email: '  MaddalaHarshvardhan@Gmail.com ' }, undefined)).toBe(true);
    expect(isAppAdmin({ email: 'a@x.com' }, ' A@X.com , other@x.com ')).toBe(true);
  });

  it('rejects users who are not listed', () => {
    expect(isAppAdmin({ email: 'someone@else.com' }, undefined)).toBe(false);
    expect(isAppAdmin({ email: 'someone@else.com' }, 'a@x.com')).toBe(false);
  });

  it('stops honouring the default once the variable is set', () => {
    expect(isAppAdmin({ email: OWNER_EMAIL }, 'a@x.com')).toBe(false);
  });

  it('treats a blank variable as no admins', () => {
    expect(isAppAdmin({ email: OWNER_EMAIL }, '')).toBe(false);
  });

  it('rejects missing users and missing emails', () => {
    expect(isAppAdmin(null, undefined)).toBe(false);
    expect(isAppAdmin(undefined, undefined)).toBe(false);
    expect(isAppAdmin({ email: null }, undefined)).toBe(false);
    expect(isAppAdmin({ email: '' }, undefined)).toBe(false);
    expect(isAppAdmin({}, undefined)).toBe(false);
  });

  it('does not match on a partial email', () => {
    expect(isAppAdmin({ email: 'xmaddalaharshvardhan@gmail.com' }, undefined)).toBe(false);
  });
});
