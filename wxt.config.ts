import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'QueryHouse',
    description: 'Local ClickHouse Play SQL editor helpers.',
    version: '0.1.0',
    permissions: ['activeTab', 'scripting', 'storage'],
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    action: {
      default_title: 'QueryHouse',
      default_popup: 'popup.html'
    }
  }
});
