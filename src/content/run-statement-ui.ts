import { getDocumentColorMode, listenForThemeChanges } from '../theme';

const STYLE_ID = 'queryhouse-run-statement-style';

export type RunStatementAction = {
  id: string;
  anchor: DOMRect;
  clipRect?: DOMRect;
  onRun: () => void;
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
        const button = ownerDocument.createElement('button');
        button.type = 'button';
        button.className = 'queryhouse-run-statement';
        button.dataset.queryhouseStatementId = action.id;
        button.innerHTML = [
          '<span class="queryhouse-run-statement-icon" aria-hidden="true"></span>',
          '<span class="queryhouse-run-statement-run">Run</span>',
        ].join('');
        button.addEventListener('mousedown', (event) => event.preventDefault());
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          action.onRun();
        });
        ownerDocument.body.append(button);
        applyThemeClass(ownerDocument, button);
        button.style.visibility = 'hidden';
        positionButton(button, action);
        button.style.visibility = '';
        buttons.push(button);
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

function positionButton(button: HTMLElement, action: RunStatementAction) {
  const margin = 8;
  const rect = button.getBoundingClientRect();
  const anchor = action.anchor;
  if (!isAnchorVisibleInViewport(anchor, margin) || (action.clipRect && !rectsIntersect(anchor, action.clipRect))) {
    button.hidden = true;
    return;
  }

  button.hidden = false;
  let left = anchor.left;
  let top = anchor.top - Math.max(rect.height, (anchor.height + rect.height) / 2);

  if (left + rect.width > window.innerWidth - margin) {
    left = window.innerWidth - margin - rect.width;
  }
  if (left < margin) {
    left = margin;
  }
  const minTop = Math.max(margin, action.clipRect?.top ?? margin);
  if (top < minTop) {
    top = minTop;
  }

  button.style.left = `${left}px`;
  button.style.top = `${top}px`;
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
    .queryhouse-run-statement {
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

    .queryhouse-run-statement:hover {
      color: #111827;
      background: rgba(248, 250, 252, 0.98);
    }

    .queryhouse-run-statement.is-dark {
      border-color: rgba(248, 250, 252, 0.16);
      color: #f8fafc;
      background: rgba(15, 23, 42, 0.72);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.28);
    }

    .queryhouse-run-statement.is-dark:hover {
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

    .queryhouse-run-statement-separator,
    .queryhouse-run-statement-hint {
      color: #cbd5e1;
    }
  `;
  ownerDocument.head.append(style);
}
