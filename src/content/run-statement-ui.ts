import { getDocumentColorMode, listenForThemeChanges } from '../theme';

const STYLE_ID = 'queryhouse-run-statement-style';

export type RunStatementAction = {
  id: string;
  anchor: DOMRect;
  clipRect?: DOMRect;
  onRun: () => void;
  onCopy?: () => void | Promise<void>;
};

export type RunStatementController = {
  setActions(actions: RunStatementAction[]): void;
  hide(): void;
  destroy(): void;
};

export function createRunStatementController(ownerDocument: Document): RunStatementController {
  ensureStyles(ownerDocument);
  const buttons: HTMLButtonElement[] = [];
  const themeDisposer = listenForThemeChanges(ownerDocument, () => {
    buttons.forEach((button) => applyThemeClass(ownerDocument, button));
  });

  function clear() {
    buttons.splice(0).forEach((button) => button.remove());
  }

  return {
    setActions(actions) {
      clear();
      actions.forEach((action) => {
        const runButton = ownerDocument.createElement('button');
        runButton.type = 'button';
        runButton.className = 'queryhouse-statement-action queryhouse-run-statement';
        runButton.dataset.queryhouseStatementId = action.id;
        runButton.innerHTML = [
          '<span class="queryhouse-run-statement-icon" aria-hidden="true"></span>',
          '<span class="queryhouse-run-statement-run">Run</span>',
        ].join('');
        runButton.addEventListener('mousedown', (event) => event.preventDefault());
        runButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          action.onRun();
        });

        const actionButtons = [runButton];
        let copyButton: HTMLButtonElement | null = null;
        if (action.onCopy) {
          copyButton = ownerDocument.createElement('button');
          copyButton.type = 'button';
          copyButton.className = 'queryhouse-statement-action queryhouse-copy-statement';
          copyButton.dataset.queryhouseStatementId = action.id;
          copyButton.title = 'Copy statement';
          copyButton.setAttribute('aria-label', 'Copy statement');
          copyButton.innerHTML = [
            '<span class="queryhouse-copy-statement-icon" aria-hidden="true"></span>',
            '<span class="queryhouse-copy-statement-copy">Copy</span>',
          ].join('');
          copyButton.addEventListener('mousedown', (event) => event.preventDefault());
          copyButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            void Promise.resolve(action.onCopy?.()).catch(() => undefined);
          });
          actionButtons.push(copyButton);
        }

        actionButtons.forEach((button) => {
          ownerDocument.body.append(button);
          applyThemeClass(ownerDocument, button);
          button.style.visibility = 'hidden';
        });
        positionButtons(runButton, copyButton, action);
        actionButtons.forEach((button) => {
          button.style.visibility = '';
        });
        buttons.push(...actionButtons);
      });
    },
    hide() {
      clear();
    },
    destroy() {
      clear();
      themeDisposer();
    }
  };
}

function applyThemeClass(ownerDocument: Document, button: HTMLElement) {
  button.classList.toggle('is-dark', getDocumentColorMode(ownerDocument) === 'dark');
}

function positionButtons(runButton: HTMLElement, copyButton: HTMLElement | null, action: RunStatementAction) {
  const margin = 8;
  const buttonGap = 4;
  const statementGap = 3;
  const runRect = runButton.getBoundingClientRect();
  const copyRect = copyButton?.getBoundingClientRect();
  const anchor = action.anchor;
  if (!isAnchorVisibleInViewport(anchor, margin) || (action.clipRect && !rectsIntersect(anchor, action.clipRect))) {
    runButton.hidden = true;
    if (copyButton) copyButton.hidden = true;
    return;
  }

  runButton.hidden = false;
  if (copyButton) copyButton.hidden = false;
  const groupWidth = runRect.width + (copyRect ? buttonGap + copyRect.width : 0);
  const groupHeight = Math.max(runRect.height, copyRect?.height ?? 0);
  let left = anchor.left;
  let top = anchor.top - Math.max(groupHeight, (anchor.height + groupHeight) / 2) - statementGap;

  if (left + groupWidth > window.innerWidth - margin) {
    left = window.innerWidth - margin - groupWidth;
  }
  if (left < margin) {
    left = margin;
  }
  const minTop = Math.max(margin, action.clipRect?.top ?? margin);
  if (top < minTop) {
    top = minTop;
  }

  runButton.style.left = `${left}px`;
  runButton.style.top = `${top}px`;
  if (copyButton) {
    copyButton.style.left = `${left + runRect.width + buttonGap}px`;
    copyButton.style.top = `${top}px`;
  }
}

function isAnchorVisibleInViewport(anchor: DOMRect, margin: number) {
  return anchor.bottom > margin && anchor.top < window.innerHeight - margin && anchor.right > 0 && anchor.left < window.innerWidth;
}

function rectsIntersect(anchor: DOMRect, clipRect: DOMRect) {
  return anchor.bottom > clipRect.top && anchor.top < clipRect.bottom && anchor.right > clipRect.left && anchor.left < clipRect.right;
}

function ensureStyles(ownerDocument: Document) {
  if (ownerDocument.getElementById(STYLE_ID)) {
    return;
  }

  const style = ownerDocument.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .queryhouse-statement-action {
      position: fixed;
      z-index: 2147483647;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 18px;
      border: 1px solid rgba(203, 213, 225, 0.92);
      border-radius: 4px;
      padding: 0 4px;
      color: #1f2937;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.16);
      font: 11px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer;
    }

    .queryhouse-statement-action:hover {
      color: #111827;
      background: rgba(248, 250, 252, 0.98);
    }

    .queryhouse-statement-action.is-dark {
      border-color: rgba(248, 250, 252, 0.16);
      color: #f8fafc;
      background: rgba(15, 23, 42, 0.72);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.28);
    }

    .queryhouse-statement-action.is-dark:hover {
      color: #ffffff;
      background: rgba(15, 23, 42, 0.88);
    }

    .queryhouse-run-statement-icon {
      width: 0;
      height: 0;
      border-top: 4px solid transparent;
      border-bottom: 4px solid transparent;
      border-left: 7px solid currentColor;
    }

    .queryhouse-run-statement-run {
      color: currentColor;
    }

    .queryhouse-copy-statement-icon {
      position: relative;
      width: 9px;
      height: 9px;
      box-sizing: border-box;
      border: 1px solid currentColor;
      border-radius: 1px;
    }

    .queryhouse-copy-statement-icon::before {
      content: "";
      position: absolute;
      left: -3px;
      top: -3px;
      width: 7px;
      height: 7px;
      box-sizing: border-box;
      border: 1px solid currentColor;
      border-radius: 1px;
      background: inherit;
    }

    .queryhouse-copy-statement-copy {
      color: currentColor;
    }

    .queryhouse-run-statement-separator,
    .queryhouse-run-statement-hint {
      color: #cbd5e1;
    }
  `;
  ownerDocument.head.append(style);
}
