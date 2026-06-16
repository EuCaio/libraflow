# tests/bdd/features/notification.feature

Feature: Envio de Notificações
  Como sistema de empréstimos
  Eu quero enviar notificações automáticas
  Para manter os usuários informados sobre seus empréstimos

  Scenario: Criação de notificação de confirmação de empréstimo
    When o sistema cria uma notificação de confirmação para "user@test.com" com livro "Clean Code"
    Then a notificação deve ser do tipo "LOAN_CREATED"
    And a notificação deve estar com status "PENDING"
    And o assunto deve mencionar "Clean Code"

  Scenario: Criação de lembrete de devolução
    Given que o prazo de devolução é em 3 dias
    When o sistema cria um lembrete para "user@test.com" com livro "SOLID Principles"
    Then a notificação deve ser do tipo "LOAN_REMINDER"
    And o assunto deve mencionar "3 dias"

  Scenario: Criação de alerta de atraso
    Given que o livro está em atraso há 5 dias
    When o sistema cria um alerta de atraso para "user@test.com" com livro "DDD"
    Then a notificação deve ser do tipo "LOAN_OVERDUE"
    And o assunto deve mencionar "5 dias"

  Scenario: Envio bem-sucedido via canal de email
    Given que existe um canal de email configurado
    When o serviço envia a notificação
    Then a notificação deve ter status "SENT"
    And a data de envio deve estar preenchida
