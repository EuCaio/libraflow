# tests/bdd/features/create-loan.feature

Feature: Empréstimo de Livros
  Como usuário cadastrado da biblioteca
  Eu quero emprestar livros disponíveis
  Para que eu possa ler os materiais do acervo

  Background:
    Given que existe um usuário ativo com id "user-bdd-001" e perfil "STUDENT"
    And que existe um livro disponível com id "book-bdd-001"

  Scenario: Empréstimo bem-sucedido de livro disponível
    Given que o usuário "user-bdd-001" não possui empréstimos ativos
    When ele solicita empréstimo do livro "book-bdd-001"
    Then o empréstimo deve ser criado com status "ACTIVE"
    And o prazo de devolução deve ser de 14 dias a partir de hoje
    And o evento "loan.created" deve ter sido publicado

  Scenario: Falha ao emprestar livro indisponível
    Given que o livro "book-bdd-001" está indisponível
    When ele solicita empréstimo do livro "book-bdd-001"
    Then deve ocorrer um erro com código "BOOK_NOT_AVAILABLE"
    And nenhum empréstimo deve ter sido criado

  Scenario: Falha quando usuário possui empréstimo em atraso
    Given que o usuário "user-bdd-001" possui 1 empréstimo em atraso
    When ele solicita empréstimo do livro "book-bdd-001"
    Then deve ocorrer um erro com código "USER_HAS_OVERDUE_LOANS"

  Scenario Outline: Limite de empréstimos por perfil de usuário
    Given que o usuário "user-bdd-001" tem perfil "<perfil>"
    And que o usuário "user-bdd-001" possui "<atual>" empréstimos ativos
    When ele solicita empréstimo do livro "book-bdd-001"
    Then o resultado deve ser "<resultado>"

    Examples:
      | perfil     | atual | resultado              |
      | STUDENT    | 2     | SUCESSO                |
      | STUDENT    | 3     | LOAN_LIMIT_EXCEEDED    |
      | PROFESSOR  | 9     | SUCESSO                |
      | PROFESSOR  | 10    | LOAN_LIMIT_EXCEEDED    |
      | RESEARCHER | 14    | SUCESSO                |
      | RESEARCHER | 15    | LOAN_LIMIT_EXCEEDED    |
