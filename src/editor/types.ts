export type TextRange = {
  start: number;
  end: number;
};

export type EditorAdapter = {
  readonly element: HTMLElement;
  getText(): string;
  getCursor(): number;
  getSelection(): TextRange;
  replaceRange(range: TextRange, text: string): void;
  onChange(listener: () => void): () => void;
  onCursor(listener: () => void): () => void;
  getAnchorRect(): DOMRect;
  getTextOffsetRect(offset: number): DOMRect;
  runStatement(sql: string): boolean;
  setCurrentQueryRange(range: TextRange | null): void;
  setDiagnostics(messages: string[]): void;
  destroy(): void;
};
