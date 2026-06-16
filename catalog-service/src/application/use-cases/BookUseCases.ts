// src/application/use-cases/CreateBookUseCase.ts

import { Book } from '../../domain/entities/Book';
import { IBookRepository } from '../../domain/repositories/IBookRepository';

export interface CreateBookDTO {
  title: string;
  isbn: string;
  authors: string[];
  categoryId: string;
  totalCopies: number;
  publishedYear?: number;
  description?: string;
}

export interface BookResponseDTO {
  id: string;
  title: string;
  isbn: string;
  authors: string[];
  categoryId: string;
  totalCopies: number;
  availableCopies: number;
  isAvailable: boolean;
  publishedYear: number | null;
  description: string;
}

function toDTO(book: Book): BookResponseDTO {
  return {
    id: book.getId(),
    title: book.getTitle(),
    isbn: book.getIsbn(),
    authors: book.getAuthors(),
    categoryId: book.getCategoryId(),
    totalCopies: book.getTotalCopies(),
    availableCopies: book.getAvailableCopies(),
    isAvailable: book.isAvailable(),
    publishedYear: book.getPublishedYear(),
    description: book.getDescription(),
  };
}

export class IsbnAlreadyExistsError extends Error {
  readonly code = 'ISBN_ALREADY_EXISTS';
  readonly httpStatus = 409;
  constructor(isbn: string) { super(`ISBN '${isbn}' already exists`); }
}

export class CreateBookUseCase {
  constructor(private readonly bookRepository: IBookRepository) {}

  async execute(dto: CreateBookDTO): Promise<BookResponseDTO> {
    const existing = await this.bookRepository.findByIsbn(dto.isbn);
    if (existing) throw new IsbnAlreadyExistsError(dto.isbn);

    const book = new Book(dto);
    await this.bookRepository.save(book);
    return toDTO(book);
  }
}

// ── SearchBooksUseCase ────────────────────────────────────────────────────────

import { BookSearchQuery, PaginatedResult } from '../../domain/repositories/IBookRepository';

export class SearchBooksUseCase {
  constructor(private readonly bookRepository: IBookRepository) {}

  async execute(query: BookSearchQuery): Promise<PaginatedResult<BookResponseDTO>> {
    const result = await this.bookRepository.search({
      ...query,
      page: query.page ?? 1,
      limit: Math.min(query.limit ?? 20, 100),
    });
    return { ...result, data: result.data.map(toDTO) };
  }
}

// ── Adjust copies (called by loan-service) ────────────────────────────────────

export class BookNotFoundError extends Error {
  readonly code = 'BOOK_NOT_FOUND';
  readonly httpStatus = 404;
  constructor(id: string) { super(`Book '${id}' not found`); }
}

export class AdjustCopiesUseCase {
  constructor(private readonly bookRepository: IBookRepository) {}

  async decrement(bookId: string): Promise<void> {
    const book = await this.bookRepository.findById(bookId);
    if (!book) throw new BookNotFoundError(bookId);
    book.checkout();
    await this.bookRepository.update(book);
  }

  async increment(bookId: string): Promise<void> {
    const book = await this.bookRepository.findById(bookId);
    if (!book) throw new BookNotFoundError(bookId);
    book.returnCopy();
    await this.bookRepository.update(book);
  }
}
