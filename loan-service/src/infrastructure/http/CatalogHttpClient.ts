// src/infrastructure/http/CatalogHttpClient.ts

import axios, { AxiosInstance } from 'axios';
import { BookInfo, ICatalogClient } from '../../application/interfaces/ICatalogClient';

export class CatalogHttpClient implements ICatalogClient {
  private readonly http: AxiosInstance;

  constructor(baseURL: string) {
    const normalizedBaseURL = /^https?:\/\//.test(baseURL) ? baseURL : `https://${baseURL}`;
    this.http = axios.create({ baseURL: normalizedBaseURL, timeout: 5000 });
  }

  async findBookById(bookId: string): Promise<BookInfo | null> {
    try {
      const { data } = await this.http.get<BookInfo>(`/books/${bookId}`);
      return data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  }

  async decrementAvailableCopies(bookId: string): Promise<void> {
    await this.http.patch(`/books/${bookId}/decrement-copies`);
  }

  async incrementAvailableCopies(bookId: string): Promise<void> {
    await this.http.patch(`/books/${bookId}/increment-copies`);
  }
}

// Mock for tests
export class MockCatalogClient implements ICatalogClient {
  private books = new Map<string, BookInfo>();

  mockBookAvailable(bookId: string, title = 'Mock Book'): void {
    this.books.set(bookId, {
      id: bookId,
      title,
      isbn: '000-0000',
      isAvailable: true,
      availableCopies: 3,
    });
  }

  mockBookUnavailable(bookId: string): void {
    this.books.set(bookId, {
      id: bookId,
      title: 'Unavailable Book',
      isbn: '000-0001',
      isAvailable: false,
      availableCopies: 0,
    });
  }

  async findBookById(bookId: string): Promise<BookInfo | null> {
    return this.books.get(bookId) ?? null;
  }

  async decrementAvailableCopies(_bookId: string): Promise<void> {}
  async incrementAvailableCopies(_bookId: string): Promise<void> {}
}
