// src/infrastructure/database/InMemoryBookRepository.ts

import { Book } from '../../domain/entities/Book';
import {
  IBookRepository,
  BookSearchQuery,
  PaginatedResult,
} from '../../domain/repositories/IBookRepository';

export class InMemoryBookRepository implements IBookRepository {
  private books = new Map<string, Book>();

  async findById(id: string): Promise<Book | null> {
    return this.books.get(id) ?? null;
  }

  async findByIsbn(isbn: string): Promise<Book | null> {
    return Array.from(this.books.values()).find(b => b.getIsbn() === isbn) ?? null;
  }

  async search(query: BookSearchQuery): Promise<PaginatedResult<Book>> {
    let data = Array.from(this.books.values());
    if (query.term) {
      const term = query.term.toLowerCase();
      data = data.filter(b =>
        b.getTitle().toLowerCase().includes(term) ||
        b.getAuthors().some(a => a.toLowerCase().includes(term)),
      );
    }
    if (query.categoryId) {
      data = data.filter(b => b.getCategoryId() === query.categoryId);
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return {
      data: data.slice((page - 1) * limit, page * limit),
      total: data.length,
      page,
      limit,
    };
  }

  async save(book: Book): Promise<void> { this.books.set(book.getId(), book); }
  async update(book: Book): Promise<void> { this.books.set(book.getId(), book); }
  async delete(id: string): Promise<void> { this.books.delete(id); }
  clear(): void { this.books.clear(); }
  count(): number { return this.books.size; }
}
