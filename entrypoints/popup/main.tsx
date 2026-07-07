import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  QUERYHOUSE_SCRIPT_PUBLIC_PATH,
  addEnabledOrigin,
  getEnabledOrigins,
  getOriginLabel,
  getOriginPattern,
  removeEnabledOrigin,
  syncRegisteredContentScript
} from '../../src/extension/site-access';
import './style.css';

type QueryHouseGlobal = typeof globalThis & {
  __queryhouseApp?: {
    destroy(): void;
  };
};

type CurrentSite = {
  tabId: number;
  pattern: string;
  label: string;
};

type ChromePermissionsApi = {
  permissions: {
    request(permissions: { origins: string[] }, callback: (granted: boolean) => void): void;
  };
  runtime: {
    lastError?: {
      message?: string;
    };
  };
};

function Popup() {
  const [site, setSite] = React.useState<CurrentSite | null>(null);
  const [enabled, setEnabled] = React.useState(false);
  const [permissionGranted, setPermissionGranted] = React.useState(false);
  const [status, setStatus] = React.useState('Checking this tab...');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    void loadCurrentSite();
  }, []);

  async function loadCurrentSite() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const tabUrl = tab?.url ?? (tab?.id ? await getTabUrlFromPage(tab.id) : null);
    const pattern = tabUrl ? getOriginPattern(tabUrl) : null;

    if (!tab?.id || !pattern) {
      setSite(null);
      setStatus('Open an http or https ClickHouse page to enable QueryHouse.');
      return;
    }

    setSite({
      tabId: tab.id,
      pattern,
      label: getOriginLabel(pattern)
    });
    setEnabled((await getEnabledOrigins()).includes(pattern));
    setPermissionGranted(await browser.permissions.contains({ origins: [pattern] }));
    setStatus('QueryHouse can be enabled for this site.');
  }

  async function enableSite() {
    if (!site) {
      return;
    }

    const permissionRequest = requestOriginPermission(site.pattern);
    setBusy(true);
    setStatus('Requesting site access...');
    try {
      const granted = await permissionRequest;
      if (!granted) {
        setPermissionGranted(false);
        setStatus('Site access was not granted.');
        return;
      }

      await addEnabledOrigin(site.pattern);
      await syncRegisteredContentScript();
      await executeQueryHouseScript(site.tabId);
      setEnabled(true);
      setPermissionGranted(true);
      setStatus('Enabled. Refreshing the page is not required.');
    } catch (error) {
      setStatus(`Could not request site access: ${getErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function disableSite() {
    if (!site) {
      return;
    }

    setBusy(true);
    setStatus('Disabling site access...');
    try {
      await browser.scripting.executeScript({
        target: { tabId: site.tabId },
        func: () => {
          const queryHouseGlobal = globalThis as QueryHouseGlobal;
          queryHouseGlobal.__queryhouseApp?.destroy();
          delete queryHouseGlobal.__queryhouseApp;
        }
      });
    } catch {
      // The current tab may already be inaccessible or unloaded. Still disable future injections.
    }

    try {
      await removeEnabledOrigin(site.pattern);
      await syncRegisteredContentScript();
      await browser.permissions.remove({ origins: [site.pattern] });
      setEnabled(false);
      setPermissionGranted(false);
      setStatus('Disabled for this site.');
    } catch {
      setStatus('QueryHouse could not remove this site.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>QueryHouse</h1>
      <p>{site ? site.label : 'No supported page selected'}</p>
      <button disabled={!site || busy} onClick={enabled ? disableSite : enableSite} type="button">
        {enabled ? 'Disable on this site' : 'Enable on this site'}
      </button>
      <dl>
        <div>
          <dt>Site access</dt>
          <dd>{permissionGranted ? 'Granted' : 'Not granted'}</dd>
        </div>
        <div>
          <dt>Activation</dt>
          <dd>{enabled ? 'On' : 'Off'}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{status}</dd>
        </div>
      </dl>
    </main>
  );
}

async function executeQueryHouseScript(tabId: number) {
  await browser.scripting.executeScript({
    target: { tabId },
    files: [QUERYHOUSE_SCRIPT_PUBLIC_PATH]
  });
}

async function getTabUrlFromPage(tabId: number) {
  try {
    const [result] = await browser.scripting.executeScript({
      target: { tabId },
      func: () => location.href
    });
    return typeof result?.result === 'string' ? result.result : null;
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

function requestOriginPermission(origin: string) {
  const chromeApi = (globalThis as typeof globalThis & { chrome?: ChromePermissionsApi }).chrome;
  if (!chromeApi) {
    return browser.permissions.request({ origins: [origin] });
  }

  return new Promise<boolean>((resolve, reject) => {
    chromeApi.permissions.request({ origins: [origin] }, (granted) => {
      const error = chromeApi.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(granted);
    });
  });
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<Popup />);
}
