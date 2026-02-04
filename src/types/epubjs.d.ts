// Extended types for epub.js

export interface BookLocation {
  start: {
    cfi: string;
    percentage: number;
    href?: string;
  };
  end: {
    cfi: string;
    percentage: number;
    href?: string;
  };
}

export interface EpubContents {
  document: Document;
  on?: (event: string, handler: () => void) => void;
}

export interface EpubContentItem {
  href?: string;
}

export interface EpubSpine {
  items?: EpubContentItem[];
}

export interface RenditionResizeable {
  resize(): void;
}
