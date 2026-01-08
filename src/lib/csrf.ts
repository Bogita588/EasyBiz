export function getCsrfToken() {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("ez_csrf="));
  if (!match) return null;
  return decodeURIComponent(match.split("=")[1]);
}
