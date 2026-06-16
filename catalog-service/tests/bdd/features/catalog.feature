# tests/bdd/features/catalog.feature

Feature: Catálogo de Livros
  Como administrador da biblioteca
  Eu quero gerenciar o acervo de livros
  Para manter o catálogo atualizado e disponível

  Scenario: Cadastro bem-sucedido de novo livro
    Given que não existe nenhum livro com ISBN "9780132350884"
    When o administrador cadastra o livro com os dados:
      | título   | Clean Code                  |
      | isbn     | 9780132350884               |
      | autores  | Robert C. Martin            |
      | cópias   | 5                           |
    Then o livro deve ser criado com 5 cópias disponíveis
    And o livro deve aparecer como "disponível"

  Scenario: Falha ao cadastrar livro com ISBN duplicado
    Given que já existe um livro com ISBN "9780132350884"
    When o administrador tenta cadastrar outro livro com ISBN "9780132350884"
    Then deve ocorrer um erro com código "ISBN_ALREADY_EXISTS"

  Scenario: Busca por título retorna resultados corretos
    Given que existem livros cadastrados no acervo
    When o usuário busca por "clean"
    Then os resultados devem conter o livro "Clean Code"
    And não devem conter livros não relacionados

  Scenario: Checkout reduz cópias disponíveis
    Given que existe o livro "9780132350884" com 3 cópias disponíveis
    When é feito checkout do livro
    Then deve restar 2 cópias disponíveis

  Scenario: Falha ao fazer checkout sem cópias disponíveis
    Given que existe o livro "9780132350884" com 0 cópias disponíveis
    When é feito checkout do livro
    Then deve ocorrer um erro de "No copies available"
