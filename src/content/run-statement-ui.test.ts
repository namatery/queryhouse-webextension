import { afterEach, describe, expect, it } from 'vitest';
import { createRunStatementController } from './run-statement-ui';

describe('createRunStatementController theme handling', () => {
  afterEach(() => {
    document.documentElement.className = '';
    document.body.replaceChildren();
  });

  it('updates statement action colors when the host theme changes', async () => {
    const controller = createRunStatementController(document);

    controller.setActions([
      {
        id: '0:9',
        anchor: new DOMRect(0, 24, 10, 18),
        onRun: () => undefined
      }
    ]);

    const button = document.querySelector<HTMLButtonElement>('.queryhouse-run-statement');
    expect(button?.classList.contains('is-dark')).toBe(false);

    document.documentElement.classList.add('dark');
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(button?.classList.contains('is-dark')).toBe(true);

    controller.destroy();
  });

  it('hides statement actions when their anchor is outside the viewport', () => {
    const controller = createRunStatementController(document);

    controller.setActions([
      {
        id: '0:9',
        anchor: new DOMRect(0, -48, 10, 18),
        onRun: () => undefined
      }
    ]);

    const button = document.querySelector<HTMLButtonElement>('.queryhouse-run-statement');
    expect(button?.hidden).toBe(true);

    controller.destroy();
  });

  it('hides statement actions when their anchor is clipped by the editor viewport', () => {
    const controller = createRunStatementController(document);

    controller.setActions([
      {
        id: '0:9',
        anchor: new DOMRect(12, 32, 10, 18),
        clipRect: new DOMRect(12, 80, 240, 120),
        onRun: () => undefined
      }
    ]);

    const button = document.querySelector<HTMLButtonElement>('.queryhouse-run-statement');
    expect(button?.hidden).toBe(true);

    controller.destroy();
  });
});
