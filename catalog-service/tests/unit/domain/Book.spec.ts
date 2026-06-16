// tests/unit/domain/Book.spec.ts

import { Book } from '../../../src/domain/entities/Book';
import {
  CreateBookUseCase,
  SearchBooksUseCase,
  IsbnAlreadyExistsError,
} from '../../../src/application/use-cases/BookUseCases';
import { InMemoryBookRepository } from '../../../src/infrastructure/database/InMemoryBookRepository';

const makeBook = (overrides = {}) =>
  new Book({
    title: 'Clean Code',
    isbn: '9780132350884',
    authors: ['Robert C. Martin'],
    categoryId: 'cat-001',
    totalCopies: 5,
    ...overrides,
  });

describe('Book — Domain Entity', () => {
  it('should create a book with all copies available', () => {
    const book = makeBook();
    expect(book.isAvailable()).toBe(true);
    expect(book.getAvailableCopies()).toBe(5);
  });

  it('should decrement available copies on checkout', () => {
    const book = makeBook({ totalCopies: 2 });
    book.checkout();
    expect(book.getAvailableCopies()).toBe(1);
  });

  it('should throw when checking out with no available copies', () => {
    const book = makeBook({ totalCopies: 1 });
    book.checkout();
    expect(() => book.checkout()).toThrow('No copies available');
  });

  it('should return isAvailable=false when all copies are checked out', () => {
    const book = makeBook({ totalCopies: 1 });
    book.checkout();
    expect(book.isAvailable()).toBe(false);
  });

  it('should increment available copies on return', () => {
    const book = makeBook({ totalCopies: 2, availableCopies: 1 });
    book.returnCopy();
    expect(book.getAvailableCopies()).toBe(2);
  });

  it('should throw for invalid ISBN', () => {
    expect(() => makeBook({ isbn: '123' })).toThrow('Invalid ISBN');
  });
});

describe('CreateBookUseCase', () => {
  let sut: CreateBookUseCase;
  let repo: InMemoryBookRepository;

  beforeEach(() => {
    repo = new InMemoryBookRepository();
    sut  = new CreateBookUseCase(repo);
  });

  it('should create a book successfully', async () => {
    const result = await sut.execute({
      title: 'Clean Code',
      isbn: '9780132350884',
      authors: ['Robert C. Martin'],
      categoryId: 'cat-001',
      totalCopies: 3,
    });
    expect(result.id).toBeDefined();
    expect(result.availableCopies).toBe(3);
    expect(result.isAvailable).toBe(true);
  });

  it('should throw IsbnAlreadyExistsError for duplicate ISBN', async () => {
    await sut.execute({ title: 'Clean Code', isbn: '9780132350884', authors: ['R.C.M'], categoryId: 'cat-001', totalCopies: 1 });
    await expect(
      sut.execute({ title: 'Clean Code 2', isbn: '9780132350884', authors: ['R.C.M'], categoryId: 'cat-001', totalCopies: 1 }),
    ).rejects.toThrow(IsbnAlreadyExistsError);
  });
});

describe('SearchBooksUseCase', () => {
  let repo: InMemoryBookRepository;
  let sut: SearchBooksUseCase;

  beforeEach(async () => {
    repo = new InMemoryBookRepository();
    sut  = new SearchBooksUseCase(repo);
    const createBook = new CreateBookUseCase(repo);
    await createBook.execute({ title: 'Clean Code', isbn: '9780132350884', authors: ['R.C.M'], categoryId: 'cat-001', totalCopies: 2 });
    await createBook.execute({ title: 'The Pragmatic Programmer', isbn: '9780201616224', authors: ['Hunt'], categoryId: 'cat-001', totalCopies: 1 });
    await createBook.execute({ title: 'Domain Driven Design', isbn: '9780321125217', authors: ['Evans'], categoryId: 'cat-002', totalCopies: 3 });
  });

  it('should return all books when no filter is given', async () => {
    const result = await sut.execute({});
    expect(result.total).toBe(3);
  });

  it('should filter by term', async () => {
    const result = await sut.execute({ term: 'clean' });
    expect(result.total).toBe(1);
    expect(result.data[0].title).toBe('Clean Code');
  });

  it('should filter by categoryId', async () => {
    const result = await sut.execute({ categoryId: 'cat-002' });
    expect(result.total).toBe(1);
  });
});
