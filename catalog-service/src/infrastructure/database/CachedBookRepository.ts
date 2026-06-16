// src/infrastructure/database/CachedBookRepository.ts
// Design Pattern: Decorator — adds Redis caching transparently

import { Book } from '../../domain/entities/Book';
import {
  IBookRepository,
  BookSearchQuery,
  PaginatedResult,
} from '../../domain/repositories/IBookRepository';

export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

export class CachedBookRepository implements IBookRepository {
  private static readonly BOOK_TTL = 300;     // 5 minutes
  private static readonly SEARCH_TTL = 60;    // 1 minute

  constructor(
    private readonly inner: IBookRepository,
    private readonly cache: ICache,
  ) {}

  async findById(id: string): Promise<Book | null> {
    const key = `book:${id}`;
    const cached = await this.cache.get<Book>(key);
    if (cached) return cached;

    const book = await this.inner.findById(id);
    if (book) await this.cache.set(key, book, CachedBookRepository.BOOK_TTL);
    return book;
  }

  async findByIsbn(isbn: string): Promise<Book | null> {
    return this.inner.findByIsbn(isbn);
  }

  async search(query: BookSearchQuery): Promise<PaginatedResult<Book>> {
    const key = `books:search:${JSON.stringify(query)}`;
    const cached = await this.cache.get<PaginatedResult<Book>>(key);
    if (cached) return cached;

    const result = await this.inner.search(query);
    await this.cache.set(key, result, CachedBookRepository.SEARCH_TTL);
    return result;
  }

  async save(book: Book): Promise<void> {
    await this.inner.save(book);
    await this.cache.del(`book:${book.getId()}`);
  }

  async update(book: Book): Promise<void> {
    await this.inner.update(book);
    await this.cache.del(`book:${book.getId()}`);
  }

  async delete(id: string): Promise<void> {
    await this.inner.delete(id);
    await this.cache.del(`book:${id}`);
  }
}
