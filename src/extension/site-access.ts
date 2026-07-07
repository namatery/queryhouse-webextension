export const QUERYHOUSE_SCRIPT_FILE = 'queryhouse.js';
export const QUERYHOUSE_SCRIPT_PUBLIC_PATH = '/queryhouse.js';
export const QUERYHOUSE_SCRIPT_ID = 'queryhouse-site-access';
export const ENABLED_ORIGINS_STORAGE_KEY = 'queryhouse:enabledOrigins';

type EnabledOriginsStorage = {
  [ENABLED_ORIGINS_STORAGE_KEY]?: unknown;
};

export function getOriginPattern(urlText: string) {
  try {
    const url = new URL(urlText);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    return `${url.protocol}//${url.hostname}/*`;
  } catch {
    return null;
  }
}

export function getOriginLabel(pattern: string) {
  return pattern.replace(/\/\*$/, '');
}

export async function getEnabledOrigins() {
  const stored = (await browser.storage.local.get(ENABLED_ORIGINS_STORAGE_KEY)) as EnabledOriginsStorage;
  return normalizeOrigins(stored[ENABLED_ORIGINS_STORAGE_KEY]);
}

export async function setEnabledOrigins(origins: string[]) {
  await browser.storage.local.set({
    [ENABLED_ORIGINS_STORAGE_KEY]: normalizeOrigins(origins)
  });
}

export async function addEnabledOrigin(origin: string) {
  await setEnabledOrigins([...new Set([...(await getEnabledOrigins()), origin])]);
}

export async function removeEnabledOrigin(origin: string) {
  await setEnabledOrigins((await getEnabledOrigins()).filter((enabledOrigin) => enabledOrigin !== origin));
}

export async function syncRegisteredContentScript() {
  const origins = await getGrantedEnabledOrigins();
  const registeredScripts = await browser.scripting.getRegisteredContentScripts({ ids: [QUERYHOUSE_SCRIPT_ID] });
  const isRegistered = registeredScripts.length > 0;

  if (origins.length === 0) {
    if (isRegistered) {
      await browser.scripting.unregisterContentScripts({ ids: [QUERYHOUSE_SCRIPT_ID] });
    }
    return;
  }

  const contentScript = {
    id: QUERYHOUSE_SCRIPT_ID,
    matches: origins,
    js: [QUERYHOUSE_SCRIPT_FILE],
    runAt: 'document_idle' as const
  };

  if (isRegistered) {
    await browser.scripting.updateContentScripts([contentScript]);
    return;
  }

  await browser.scripting.registerContentScripts([contentScript]);
}

export async function pruneRevokedOrigins(revokedOrigins: string[] = []) {
  if (revokedOrigins.length === 0) {
    return;
  }

  const enabledOrigins = await getEnabledOrigins();
  const nextOrigins = enabledOrigins.filter((origin) => !revokedOrigins.includes(origin));
  if (nextOrigins.length !== enabledOrigins.length) {
    await setEnabledOrigins(nextOrigins);
  }

  await syncRegisteredContentScript();
}

async function getGrantedEnabledOrigins() {
  const enabledOrigins = await getEnabledOrigins();
  const grantedOrigins: string[] = [];

  for (const origin of enabledOrigins) {
    if (await browser.permissions.contains({ origins: [origin] })) {
      grantedOrigins.push(origin);
    }
  }

  if (grantedOrigins.length !== enabledOrigins.length) {
    await setEnabledOrigins(grantedOrigins);
  }

  return grantedOrigins;
}

function normalizeOrigins(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((origin): origin is string => typeof origin === 'string' && origin.length > 0))].sort();
}
