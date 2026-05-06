export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** OAuth-д зориулсан `.env`: `VITE_OAUTH_PORTAL_URL`, `VITE_APP_ID` (хослол байхгүй бол нэвтрэх идэвхгүй). */
export const isOAuthConfigured = (): boolean => {
  const portal = import.meta.env.VITE_OAUTH_PORTAL_URL?.trim();
  const appId = import.meta.env.VITE_APP_ID?.trim();
  return Boolean(portal && appId);
};

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = (): string => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL?.trim();
  const appId = import.meta.env.VITE_APP_ID?.trim();
  if (!oauthPortalUrl || !appId) {
    return "#";
  }
  try {
    const base = oauthPortalUrl.replace(/\/+$/, "");
    const redirectUri = `${window.location.origin}/api/oauth/callback`;
    const state = btoa(redirectUri);
    const url = new URL(`${base}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch {
    return "#";
  }
};
