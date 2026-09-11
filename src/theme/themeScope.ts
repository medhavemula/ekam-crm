/**
 * Theme scoping for portaled layers.
 *
 * The `--ov-*` and `--field-*` custom properties are declared on a theme class
 * (see the THEME TOKENS block in src/index.css) that a page puts on its wrapper.
 * A dropdown or calendar portaled to <body> lands *outside* that wrapper, so it
 * resolves the `:root` fallbacks instead of the page's theme and renders in the
 * wrong palette.
 *
 * The fix is to re-apply the nearest themed ancestor's class to the portaled
 * element itself. Keep this list in step with the theme blocks in index.css.
 */
export const THEME_CLASSES = [
  "ekam-indigo",
  "ekam-neutral",
  "ekam-teal",
  "ekam-daylight",
  "ekam-combo1",
] as const;

export type ThemeClass = (typeof THEME_CLASSES)[number];

/**
 * The theme class of the nearest themed ancestor, or "" when the element sits on
 * an unthemed page — in which case the `:root` defaults are already correct.
 */
export function themeClassFor(element: Element | null | undefined): string {
  let node: Element | null = element ?? null;
  while (node) {
    for (const cls of THEME_CLASSES) {
      if (node.classList?.contains(cls)) return cls;
    }
    node = node.parentElement;
  }
  return "";
}

/**
 * The theme currently on the page, for layers portaled to <body> that have no
 * anchor element to walk up from — a modal, for instance, which is opened from a
 * page rather than positioned against a trigger.
 *
 * Matches on the exact class names rather than a `[class*="ekam-"]` selector,
 * which would also hit the `ekam-figure` and `ekam-eyebrow` type utilities.
 */
export function activeThemeClass(): string {
  if (typeof document === "undefined") return "";
  for (const cls of THEME_CLASSES) {
    if (document.querySelector(`.${cls}`)) return cls;
  }
  return "";
}

/**
 * The theme every redesigned admin screen wears.
 *
 * This is the single place it is decided. It started as one constant in
 * Dashboard.tsx, but each new page copied the class name as a literal until
 * twelve files carried it and changing the look meant twelve edits. Point this
 * at any block in the THEME TOKENS section of src/index.css and the whole
 * admin surface follows.
 */
export const ADMIN_THEME: ThemeClass = "ekam-combo1";
