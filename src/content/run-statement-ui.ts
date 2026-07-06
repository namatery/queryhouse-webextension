const STYLE_ID = 'queryhouse-run-statement-style';

export type RunStatementController = {
  show(anchor: DOMRect, onRun: () => void): void;
  hide(): void;
  destroy(): void;
};

export function createRunStatementController(ownerDocument: Document): RunStatementController {
  ensureStyles(ownerDocument);
  const button = ownerDocument.createElement('button');
  button.type = 'button';
  button.className = 'queryhouse-run-statement';
  button.textContent = 'Run';
  button.hidden = true;
  ownerDocument.body.append(button);

  let run: (() => void) | null = null;
  button.addEventListener('mousedown', (event) => event.preventDefault());
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    run?.();
  });

  return {
    show(anchor, onRun) {
      run = onRun;
      button.hidden = false;
      button.style.visibility = 'hidden';
      positionButton(button, anchor);
      button.style.visibility = '';
    },
    hide() {
      button.hidden = true;
      run = null;
    },
    destroy() {
      button.remove();
    }
  };
}

function positionButton(button: HTMLElement, anchor: DOMRect) {
  const margin = 8;
  const gap = 6;
  const rect = button.getBoundingClientRect();
  let left = anchor.right + gap;
  let top = anchor.top - 2;

  if (left + rect.width > window.innerWidth - margin) {
    left = anchor.left - rect.width - gap;
  }
  if (left < margin) {
    left = margin;
  }
  if (top + rect.height > window.innerHeight - margin) {
    top = window.innerHeight - margin - rect.height;
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
      min-width: 44px;
      height: 24px;
      border: 1px solid #1a73e8;
      border-radius: 4px;
      padding: 0 10px;
      color: #ffffff;
      background: #1a73e8;
      box-shadow: 0 4px 12px rgba(26, 115, 232, 0.24);
      font: 12px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer;
    }

    .queryhouse-run-statement:hover {
      background: #1558b0;
      border-color: #1558b0;
    }
  `;
  ownerDocument.head.append(style);
}
