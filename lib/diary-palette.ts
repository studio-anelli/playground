export const DIARY_STYLE_STORAGE = "playground-diary-editor-beta02-blue-v2";

export const diaryPalette = {
  background: "#0433ff",
  ink: "#000000",
  accent: "#d6d6d6",
};

export function readDiaryPalette() {
  const palette = { ...diaryPalette };
  try {
    const saved = JSON.parse(window.localStorage.getItem(DIARY_STYLE_STORAGE) || "null");
    for (const key of ["background", "ink", "accent"] as const) {
      if (typeof saved?.[key] === "string" && /^#[0-9a-f]{6}$/i.test(saved[key])) {
        palette[key] = saved[key];
      }
    }
  } catch { /* Use the published palette when storage is unavailable. */ }
  return palette;
}
