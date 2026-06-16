// tests/bdd/step-definitions/catalog.steps.ts

import { Given, When, Then, Before, DataTable, World } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import { Book } from '../../../src/domain/entities/Book';
import { InMemoryBookRepository } from '../../../src/infrastructure/database/InMemoryBookRepository';
import {
  CreateBookUseCase,
  SearchBooksUseCase,
  IsbnAlreadyExistsError,
} from '../../../src/application/use-cases/BookUseCases';

interface CatalogWorld extends World {
  repo: InMemoryBookRepository;
  createBook: CreateBookUseCase;
  searchBooks: SearchBooksUseCase;
  result: any;
  searchResults: any;
  error: any;
}

Before(function (this: CatalogWorld) {
  this.repo        = new InMemoryBookRepository();
  this.createBook  = new CreateBookUseCase(this.repo);
  this.searchBooks = new SearchBooksUseCase(this.repo);
  this.result      = null;
  this.error       = null;
});

Given('que não existe nenhum livro com ISBN {string}', function (_isbn: string) {
  // nothing — repo is empty
});

Given('que já existe um livro com ISBN {string}', async function (this: CatalogWorld, isbn: string) {
  await this.createBook.execute({
    title: 'Existing Book', isbn, authors: ['Author'],
    categoryId: 'cat-001', totalCopies: 1,
  });
});

Given('que existem livros cadastrados no acervo', async function (this: CatalogWorld) {
  await this.createBook.execute({ title: 'Clean Code', isbn: '9780132350884', authors: ['R.C.M'], categoryId: 'cat-001', totalCopies: 3 });
  await this.createBook.execute({ title: 'The Pragmatic Programmer', isbn: '9780201616224', authors: ['Hunt'], categoryId: 'cat-001', totalCopies: 2 });
  await this.createBook.execute({ title: 'Domain Driven Design', isbn: '9780321125217', authors: ['Evans'], categoryId: 'cat-002', totalCopies: 1 });
});

Given('que existe o livro {string} com {int} cópias disponíveis', async function (this: CatalogWorld, isbn: string, copies: number) {
  await this.repo.save(new Book({ title: 'Test Book', isbn, authors: ['Author'], categoryId: 'cat-001', totalCopies: copies, availableCopies: copies }));
});

When('o administrador cadastra o livro com os dados:', async function (this: CatalogWorld, dataTable: DataTable) {
  const data = dataTable.rowsHash();
  try {
    this.result = await this.createBook.execute({
      title: data['título'], isbn: data['isbn'],
      authors: [data['autores']], categoryId: 'cat-001',
      totalCopies: parseInt(data['cópias']),
    });
  } catch (err) { this.error = err; }
});

When('o administrador tenta cadastrar outro livro com ISBN {string}', async function (this: CatalogWorld, isbn: string) {
  try {
    this.result = await this.createBook.execute({ title: 'Duplicate', isbn, authors: ['A'], categoryId: 'cat-001', totalCopies: 1 });
  } catch (err) { this.error = err; }
});

When('o usuário busca por {string}', async function (this: CatalogWorld, term: string) {
  this.searchResults = await this.searchBooks.execute({ term });
});

When('é feito checkout do livro', async function (this: CatalogWorld) {
  const books = await this.repo.search({});
  try {
    books.data[0].checkout();
    await this.repo.update(books.data[0]);
  } catch (err) { this.error = err; }
});

Then('o livro deve ser criado com {int} cópias disponíveis', function (this: CatalogWorld, copies: number) {
  assert.ok(this.result);
  assert.equal(this.result.availableCopies, copies);
});

Then('o livro deve aparecer como {string}', function (this: CatalogWorld, status: string) {
  if (status === 'disponível') assert.equal(this.result.isAvailable, true);
  else assert.equal(this.result.isAvailable, false);
});

Then('deve ocorrer um erro com código {string}', function (this: CatalogWorld, code: string) {
  assert.ok(this.error, `Expected error '${code}' but got none`);
  assert.equal((this.error as any).code, code);
});

Then('os resultados devem conter o livro {string}', function (this: CatalogWorld, title: string) {
  const found = this.searchResults.data.some((b: any) => b.title === title);
  assert.ok(found, `Expected to find book '${title}'`);
});

Then('não devem conter livros não relacionados', function (this: CatalogWorld) {
  const hasUnrelated = this.searchResults.data.some(
    (b: any) => !b.title.toLowerCase().includes('clean'),
  );
  assert.ok(!hasUnrelated, 'Found unrelated books in search results');
});

Then('deve restar {int} cópias disponíveis', async function (this: CatalogWorld, copies: number) {
  const books = await this.repo.search({});
  assert.equal(books.data[0].getAvailableCopies(), copies);
});

Then('deve ocorrer um erro de {string}', function (this: CatalogWorld, message: string) {
  assert.ok(this.error, `Expected error '${message}' but got none`);
  assert.ok((this.error as Error).message.includes(message));
});
