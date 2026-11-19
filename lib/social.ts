import "server-only";

/**
 * Woodin's social accounts, set with environment variables (defaults are the accounts on
 * woodinfashion.com). Set a variable to an empty string to hide that network.
 *   SOCIAL_INSTAGRAM_URL, SOCIAL_FACEBOOK_URL, SOCIAL_X_URL, SOCIAL_YOUTUBE_URL
 */
const pick = (value: string | undefined, fallback: string) => (value === undefined ? fallback : value.trim());

const ALL = [
  { key: "instagram", label: "Instagram", href: pick(process.env.SOCIAL_INSTAGRAM_URL, "https://www.instagram.com/woodinfashion") },
  { key: "facebook", label: "Facebook", href: pick(process.env.SOCIAL_FACEBOOK_URL, "https://www.facebook.com/woodinfashion") },
  { key: "x", label: "X (Twitter)", href: pick(process.env.SOCIAL_X_URL, "https://twitter.com/woodinafrica") },
  { key: "youtube", label: "YouTube", href: pick(process.env.SOCIAL_YOUTUBE_URL, "https://www.youtube.com/user/thenationiscoming") },
] as const;

export type SocialKey = (typeof ALL)[number]["key"];

/** Only https links are rendered (these come from env, but they end up in href attributes). */
export const SOCIAL_LINKS = ALL.filter((l) => /^https:\/\//.test(l.href));

export const INSTAGRAM_URL = SOCIAL_LINKS.find((l) => l.key === "instagram")?.href;
