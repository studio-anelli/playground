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
export const appearanceInitScript = `(function(){try{var s=JSON.parse(localStorage.getItem("${APPEARANCE_KEY}")||"null");var r=document.documentElement;r.dataset.sitePalette=s&&s.monochrome===true?"bw":"blue";r.dataset.siteInverted=String(!!(s&&s.inverted===true));}catch(e){}try{var p=sessionStorage.getItem("playground-logo2-frame");if(p&&p.length<2000000&&p.startsWith("data:image/png;base64,")&&new RegExp("^[A-Za-z0-9+/=]+$").test(p.slice(22)))document.documentElement.style.setProperty("--logo-poster","url("+p+")");}catch(e){}})();`;
