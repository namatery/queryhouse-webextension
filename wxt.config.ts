import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'QueryHouse',
    description: 'Local ClickHouse Play SQL editor helpers.',
    version: '0.1.0',
    permissions: ['storage'],
    host_permissions: ['http://localhost/*', 'http://127.0.0.1/*'],
    action: {
      default_title: 'QueryHouse',
      default_popup: 'popup.html'
    }
  }
});
