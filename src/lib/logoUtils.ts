const LOGO_OVERRIDES: Record<string, string> = {
  Anthropic: "https://claude.ai/apple-touch-icon.png",
};

export function getLogoUrl(orgName: string | undefined | null): string | null {
  if (!orgName) return null;
  const override = LOGO_OVERRIDES[orgName];
  if (override) return override;
  const slug = orgName.toLowerCase().replace(/\s+/g, "");
  return `https://www.google.com/s2/favicons?domain=${slug}.com&sz=128`;
}
