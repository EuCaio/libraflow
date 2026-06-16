# tests/bdd/features/manage-loan.feature

Feature: Gerenciamento de Empréstimos
  Como usuário com empréstimo ativo
  Eu quero renovar ou devolver meu empréstimo
  Para gerir minha leitura com flexibilidade

  Background:
    Given que existe um empréstimo ativo com id "loan-bdd-001" para o usuário "user-bdd-001"

  # ── Devolução ──────────────────────────────────────────────────────────────

  Scenario: Devolução bem-sucedida
    When o usuário solicita devolução do empréstimo "loan-bdd-001"
    Then o empréstimo deve ter status "RETURNED"
    And a data de devolução deve estar preenchida
    And o evento "loan.returned" deve ter sido publicado

  Scenario: Falha ao devolver empréstimo já devolvido
    Given que o empréstimo "loan-bdd-001" já foi devolvido
    When o usuário solicita devolução do empréstimo "loan-bdd-001"
    Then deve ocorrer um erro com código "LOAN_ALREADY_RETURNED"

  # ── Renovação ─────────────────────────────────────────────────────────────

  Scenario: Renovação bem-sucedida
    Given que o empréstimo "loan-bdd-001" foi renovado 0 vezes
    When o usuário solicita renovação do empréstimo "loan-bdd-001"
    Then o contador de renovações deve ser 1
    And o prazo deve ser estendido por 14 dias
    And o evento "loan.renewed" deve ter sido publicado

  Scenario: Bloqueio após 2 renovações
    Given que o empréstimo "loan-bdd-001" foi renovado 2 vezes
    When o usuário solicita renovação do empréstimo "loan-bdd-001"
    Then deve ocorrer um erro com código "MAX_RENEWALS_EXCEEDED"

  Scenario: Bloqueio de renovação para empréstimo em atraso
    Given que o empréstimo "loan-bdd-001" está em atraso
    When o usuário solicita renovação do empréstimo "loan-bdd-001"
    Then deve ocorrer um erro com código "OVERDUE_LOAN_RENEWAL"
