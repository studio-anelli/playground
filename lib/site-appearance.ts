export type SiteAppearance = { monochrome: boolean; inverted: boolean };
export const APPEARANCE_KEY = "playground-site-appearance-v1";
export const APPEARANCE_EVENT = "playground-appearance-change";
export const defaultAppearance: SiteAppearance = { monochrome: false, inverted: false };

export function readAppearance(): SiteAppearance {
  try {
    const saved = JSON.parse(localStorage.getItem(APPEARANCE_KEY) || "null");
    return { monochrome: saved?.monochrome === true, inverted: saved?.inverted === true };
  } catch { return defaultAppearance; }
}

export function applyAppearance(value: SiteAppearance) {
  document.documentElement.dataset.sitePalette = value.monochrome ? "bw" : "blue";
  document.documentElement.dataset.siteInverted = String(value.inverted);
}

// Runs before page content paints, avoiding a theme flash between menu destinations.
export const appearanceInitScript = `(function(){try{var s=JSON.parse(localStorage.getItem("${APPEARANCE_KEY}")||"null");var r=document.documentElement;r.dataset.sitePalette=s&&s.monochrome===true?"bw":"blue";r.dataset.siteInverted=String(!!(s&&s.inverted===true));}catch(e){}})();`;
