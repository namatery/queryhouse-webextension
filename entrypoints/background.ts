import { pruneRevokedOrigins, syncRegisteredContentScript } from '../src/extension/site-access';

export default defineBackground({
  main() {
    void syncRegisteredContentScript();

    browser.runtime.onInstalled.addListener(() => {
      void syncRegisteredContentScript();
    });

    browser.runtime.onStartup.addListener(() => {
      void syncRegisteredContentScript();
    });

    browser.permissions.onRemoved.addListener((permissions) => {
      void pruneRevokedOrigins(permissions.origins);
    });
  }
});
