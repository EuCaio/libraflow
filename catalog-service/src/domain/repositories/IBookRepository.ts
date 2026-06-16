// src/domain/repositories/IBookRepository.ts

import { Book } from '../entities/Book';

export interface BookSearchQuery {
  term?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface IBookRepository {
  findById(id: string): Promise<Book | null>;
  findByIsbn(isbn: string): Promise<Book | null>;
  search(query: BookSearchQuery): Promise<PaginatedResult<Book>>;
  save(book: Book): Promise<void>;
  update(book: Book): Promise<void>;
  delete(id: string): Promise<void>;
}
