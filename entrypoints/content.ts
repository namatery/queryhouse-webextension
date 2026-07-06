import { createQueryHouse } from '../src/content/app';

export default defineContentScript({
  matches: ['http://localhost/*', 'http://127.0.0.1/*', 'https://clickhouse.hamtadns.com/*'],
  main() {
    createQueryHouse(document).mount();
  }
});
