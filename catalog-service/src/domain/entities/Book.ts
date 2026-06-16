// src/domain/entities/Book.ts

export interface BookProps {
  id?: string;
  title: string;
  isbn: string;
  authors: string[];
  categoryId: string;
  totalCopies: number;
  availableCopies?: number;
  publishedYear?: number;
  description?: string;
}

export class Book {
  private readonly id: string;
  private title: string;
  private readonly isbn: string;
  private authors: string[];
  private categoryId: string;
  private readonly totalCopies: number;
  private availableCopies: number;
  private publishedYear: number | null;
  private description: string;

  constructor(props: BookProps) {
    this.validateIsbn(props.isbn);
    if (props.totalCopies < 1) throw new Error('totalCopies must be at least 1');

    this.id              = props.id ?? crypto.randomUUID();
    this.title           = props.title.trim();
    this.isbn            = props.isbn.trim();
    this.authors         = props.authors;
    this.categoryId      = props.categoryId;
    this.totalCopies     = props.totalCopies;
    this.availableCopies = props.availableCopies ?? props.totalCopies;
    this.publishedYear   = props.publishedYear ?? null;
    this.description     = props.description ?? '';
  }

  // ── Commands ──────────────────────────────────────────────────────────────

  checkout(): void {
    if (this.availableCopies <= 0) throw new Error('No copies available');
    this.availableCopies--;
  }

  returnCopy(): void {
    if (this.availableCopies >= this.totalCopies) {
      throw new Error('All copies already returned');
    }
    this.availableCopies++;
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  isAvailable(): boolean { return this.availableCopies > 0; }

  // ── Getters ───────────────────────────────────────────────────────────────

  getId(): string               { return this.id; }
  getTitle(): string            { return this.title; }
  getIsbn(): string             { return this.isbn; }
  getAuthors(): string[]        { return this.authors; }
  getCategoryId(): string       { return this.categoryId; }
  getTotalCopies(): number      { return this.totalCopies; }
  getAvailableCopies(): number  { return this.availableCopies; }
  getPublishedYear(): number | null { return this.publishedYear; }
  getDescription(): string      { return this.description; }

  private validateIsbn(isbn: string): void {
    const clean = isbn.replace(/[-\s]/g, '');
    if (clean.length !== 10 && clean.length !== 13) {
      throw new Error(`Invalid ISBN: ${isbn}`);
    }
  }
}
