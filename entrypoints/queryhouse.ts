import { createQueryHouse } from '../src/content/app';

type QueryHouseGlobal = typeof globalThis & {
  __queryhouseApp?: ReturnType<typeof createQueryHouse>;
};

export default defineUnlistedScript({
  main() {
    const queryHouseGlobal = globalThis as QueryHouseGlobal;
    if (queryHouseGlobal.__queryhouseApp) {
      return;
    }

    const queryHouse = createQueryHouse(document);
    queryHouse.mount();
    queryHouseGlobal.__queryhouseApp = queryHouse;
    window.addEventListener(
      'pagehide',
      () => {
        queryHouse.destroy();
        delete queryHouseGlobal.__queryhouseApp;
      },
      { once: true }
    );
  }
});
