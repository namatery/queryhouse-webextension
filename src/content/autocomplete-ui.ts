import type { CompletionItem, CompletionResult } from '../sql/completions';

const STYLE_ID = 'queryhouse-autocomplete-style';

export type AutocompleteController = {
  show(result: CompletionResult, anchor: DOMRect, onPick: (item: CompletionItem) => void): void;
  hide(): void;
  handleKeydown(event: KeyboardEvent): boolean;
  destroy(): void;
};

export function createAutocompleteController(ownerDocument: Document): AutocompleteController {
  ensureStyles(ownerDocument);
  const list = ownerDocument.createElement('div');
  list.className = 'queryhouse-autocomplete';
  list.hidden = true;
  ownerDocument.body.append(list);

  let items: CompletionItem[] = [];
  let selected = 0;
  let pick: ((item: CompletionItem) => void) | null = null;

  function render() {
    list.replaceChildren(
      ...items.map((item, index) => {
        const row = ownerDocument.createElement('button');
        row.type = 'button';
        row.className = index === selected ? 'is-selected' : '';
        row.innerHTML = `<span>${escapeHtml(item.label)}</span><small>${escapeHtml(item.detail ?? item.kind)}</small>`;
        row.addEventListener('mousedown', (event) => {
          event.preventDefault();
          pick?.(item);
        });
        return row;
      })
    );
  }

  return {
    show(result, anchor, onPick) {
      items = result.items;
      selected = 0;
      pick = onPick;
      render();
      list.hidden = false;
      list.style.visibility = 'hidden';
      positionFloatingElement(list, anchor, 6);
      list.style.visibility = '';
    },
    hide() {
      list.hidden = true;
      items = [];
      pick = null;
    },
    handleKeydown(event) {
      if (list.hidden || items.length === 0) {
        return false;
      }

      if (event.key === 'ArrowDown') {
        selected = (selected + 1) % items.length;
        render();
        event.preventDefault();
        return true;
      }
      if (event.key === 'ArrowUp') {
        selected = (selected - 1 + items.length) % items.length;
        render();
        event.preventDefault();
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        const item = items[selected];
        if (item) {
          pick?.(item);
        }
        event.preventDefault();
        return true;
      }
      if (event.key === 'Escape') {
        this.hide();
        event.preventDefault();
        return true;
      }
      return false;
    },
    destroy() {
      list.remove();
    }
  };
}

function positionFloatingElement(element: HTMLElement, anchor: DOMRect, gap: number) {
  const margin = 8;
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  let left = anchor.left;
  let top = anchor.bottom + gap;

  if (left + rect.width > viewportWidth - margin) {
    left = viewportWidth - margin - rect.width;
  }
  left = Math.max(margin, left);

  if (top + rect.height > viewportHeight - margin) {
    top = anchor.top - rect.height - gap;
  }
  if (top < margin) {
    top = Math.max(margin, Math.min(anchor.bottom + gap, viewportHeight - margin - rect.height));
  }

  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
}

function ensureStyles(ownerDocument: Document) {
  if (ownerDocument.getElementById(STYLE_ID)) {
    return;
  }

  const style = ownerDocument.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .queryhouse-autocomplete {
      position: fixed;
      z-index: 2147483647;
      width: 280px;
      max-height: 220px;
      overflow: auto;
      border: 1px solid #dadce0;
      border-radius: 6px;
      background: #ffffff;
      box-shadow: 0 8px 24px rgba(60, 64, 67, 0.24);
      padding: 4px;
      font: 12px/1.3 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .queryhouse-autocomplete button {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      min-height: 28px;
      border: 0;
      border-radius: 4px;
      padding: 5px 7px;
      color: #202124;
      background: transparent;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    .queryhouse-autocomplete button.is-selected,
    .queryhouse-autocomplete button:hover {
      background: #e8f0fe;
    }

    .queryhouse-autocomplete small {
      color: #5f6368;
      font-size: 11px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;
  ownerDocument.head.append(style);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return entities[char] ?? char;
  });
}
