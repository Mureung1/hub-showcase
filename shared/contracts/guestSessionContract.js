export const GUEST_KEY_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const GUEST_KEY_RAW_LENGTH = 32;
export const GUEST_KEY_GROUP_SIZE = 4;
export const GUEST_KEY_HEADER = "x-guest-key";

export const GUEST_SESSION_LIMITS = Object.freeze({
  retentionDays: 30,
  minimumRetentionDays: 1,
  maximumRetentionDays: 365
});

export const GUEST_KEY_DISPLAY_PATTERN =
  /^(?:[0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/;

