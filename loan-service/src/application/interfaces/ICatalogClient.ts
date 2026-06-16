// src/application/interfaces/ICatalogClient.ts

export interface BookInfo {
  id: string;
  title: string;
  isbn: string;
  isAvailable: boolean;
  availableCopies: number;
}

export interface ICatalogClient {
  findBookById(bookId: string): Promise<BookInfo | null>;
  decrementAvailableCopies(bookId: string): Promise<void>;
  incrementAvailableCopies(bookId: string): Promise<void>;
}
