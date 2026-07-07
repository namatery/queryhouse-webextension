export type ColorMode = 'dark' | 'light';

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

const THEME_ATTRIBUTE_FILTER = [
  'class',
  'style',
  'data-theme',
  'data-color-mode',
  'data-theme-mode',
  'data-bs-theme',
  'data-color-scheme'
];

export function listenForThemeChanges(ownerDocument: Document, listener: () => void, sourceElement?: HTMLElement) {
  const ownerWindow = ownerDocument.defaultView ?? window;
  let timer: number | undefined;
  const schedule = () => {
    ownerWindow.clearTimeout(timer);
    timer = ownerWindow.setTimeout(listener, 0);
  };

  const observer = new ownerWindow.MutationObserver(schedule);
  getThemeMutationTargets(ownerDocument, sourceElement).forEach((target) => {
    observer.observe(target, { attributes: true, attributeFilter: THEME_ATTRIBUTE_FILTER });
  });

  const media = ownerWindow.matchMedia?.('(prefers-color-scheme: dark)');
  media?.addEventListener('change', schedule);

  return () => {
    ownerWindow.clearTimeout(timer);
    observer.disconnect();
    media?.removeEventListener('change', schedule);
  };
}

export function getDocumentColorMode(ownerDocument: Document): ColorMode {
  const ownerWindow = ownerDocument.defaultView ?? window;
  const root = ownerDocument.documentElement;
  const body = ownerDocument.body;
  const explicitMode = getExplicitColorMode(root) ?? getExplicitColorMode(body);
  if (explicitMode) {
    return explicitMode;
  }

  const bodyStyle = body ? ownerWindow.getComputedStyle(body) : null;
  const rootStyle = ownerWindow.getComputedStyle(root);
  const backgroundColor = [bodyStyle?.backgroundColor, rootStyle.backgroundColor].find((color) => color && !isTransparentColor(color));
  const textColor = bodyStyle?.color && !isTransparentColor(bodyStyle.color) ? bodyStyle.color : rootStyle.color;
  const darkByColor = getUsesDarkSurface(textColor, backgroundColor);
  if (darkByColor !== null) {
    return darkByColor ? 'dark' : 'light';
  }

  return ownerWindow.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getUsesDarkSurface(textColor: string | undefined, backgroundColor: string | undefined) {
  const textRgb = textColor && !isTransparentColor(textColor) ? parseRgbColor(textColor) : null;
  const backgroundRgb = backgroundColor && !isTransparentColor(backgroundColor) ? parseRgbColor(backgroundColor) : null;

  if (backgroundRgb) {
    return getRelativeLuminance(backgroundRgb) < 0.35;
  }

  if (textRgb) {
    return getRelativeLuminance(textRgb) > 0.55;
  }

  return null;
}

export function isTransparentColor(value: string) {
  const alpha = value.match(/rgba\(\s*[.\d]+\s*,\s*[.\d]+\s*,\s*[.\d]+\s*,\s*([.\d]+)\s*\)/i)?.[1];
  return value === 'transparent' || (alpha !== undefined && Number.parseFloat(alpha) === 0);
}

export function parseRgbColor(value: string) {
  const match = value.match(/rgba?\(\s*([.\d]+)\s*,\s*([.\d]+)\s*,\s*([.\d]+)/i);
  if (!match) {
    return null;
  }

  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3])
  };
}

export function getRelativeLuminance(color: RgbColor) {
  const [r, g, b] = [color.r, color.g, color.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function getThemeMutationTargets(ownerDocument: Document, sourceElement?: HTMLElement) {
  const targets = new Set<Element>([ownerDocument.documentElement]);
  if (ownerDocument.body) {
    targets.add(ownerDocument.body);
  }

  let ancestor = sourceElement?.parentElement;
  while (ancestor && ancestor !== ownerDocument.body && ancestor !== ownerDocument.documentElement) {
    targets.add(ancestor);
    ancestor = ancestor.parentElement;
  }

  return Array.from(targets);
}

function getExplicitColorMode(element: Element | null) {
  if (!element) {
    return null;
  }

  const themeText = [
    element.getAttribute('class'),
    element.getAttribute('style'),
    element.getAttribute('data-theme'),
    element.getAttribute('data-color-mode'),
    element.getAttribute('data-theme-mode'),
    element.getAttribute('data-bs-theme'),
    element.getAttribute('data-color-scheme')
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/(^|[\s_:-])dark($|[\s_:-])|dark-theme|theme-dark/.test(themeText)) {
    return 'dark';
  }
  if (/(^|[\s_:-])light($|[\s_:-])|light-theme|theme-light/.test(themeText)) {
    return 'light';
  }

  return null;
}
