const STYLE_ID = 'queryhouse-run-statement-style';

export type RunStatementAction = {
  id: string;
  anchor: DOMRect;
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
        button.innerHTML = '<span class="queryhouse-run-statement-icon" aria-hidden="true"></span><span>Run</span>';
        button.addEventListener('mousedown', (event) => event.preventDefault());
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          action.onRun();
        });
        ownerDocument.body.append(button);
        button.style.visibility = 'hidden';
        positionButton(button, action.anchor);
        button.style.visibility = '';
        buttons.push(button);
      });
    },
    hide() {
      clear();
    },
    destroy() {
      clear();
    }
  };
}

function positionButton(button: HTMLElement, anchor: DOMRect) {
  const margin = 8;
  const gap = 4;
  const rect = button.getBoundingClientRect();
  let left = anchor.left;
  let top = anchor.top - rect.height - gap;

  if (left + rect.width > window.innerWidth - margin) {
    left = window.innerWidth - margin - rect.width;
  }
  if (left < margin) {
    left = margin;
  }
  if (top < margin) {
    top = margin;
  }

  button.style.left = `${left}px`;
  button.style.top = `${top}px`;
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
      height: 20px;
      border: 0;
      border-radius: 4px;
      padding: 0 4px;
      color: #1a73e8;
      background: transparent;
      box-shadow: none;
      font: 12px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer;
    }

    .queryhouse-run-statement:hover {
      color: #1558b0;
      text-decoration: underline;
    }

    .queryhouse-run-statement-icon {
      width: 0;
      height: 0;
      border-top: 4px solid transparent;
      border-bottom: 4px solid transparent;
      border-left: 7px solid currentColor;
    }
  `;
  ownerDocument.head.append(style);
}
