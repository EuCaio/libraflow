# tests/bdd/features/auth.feature

Feature: Autenticação de Usuários
  Como visitante do sistema
  Eu quero me registrar e fazer login
  Para acessar os recursos da biblioteca

  Scenario: Registro bem-sucedido de novo usuário
    Given que não existe usuário com email "ana@uni.edu"
    When eu me registro com nome "Ana Silva", email "ana@uni.edu" e senha "Senha@123"
    Then o usuário deve ser criado com sucesso
    And o perfil padrão deve ser "STUDENT"

  Scenario: Falha ao registrar com email duplicado
    Given que já existe um usuário com email "ana@uni.edu"
    When eu tento me registrar novamente com email "ana@uni.edu"
    Then deve ocorrer um erro com código "EMAIL_ALREADY_IN_USE"

  Scenario: Login bem-sucedido com credenciais válidas
    Given que existe um usuário ativo com email "ana@uni.edu" e senha "Senha@123"
    When eu faço login com email "ana@uni.edu" e senha "Senha@123"
    Then devo receber um accessToken JWT
    And os dados do usuário devem estar na resposta

  Scenario: Falha ao fazer login com senha incorreta
    Given que existe um usuário ativo com email "ana@uni.edu" e senha "Senha@123"
    When eu faço login com email "ana@uni.edu" e senha "SenhaErrada"
    Then deve ocorrer um erro com código "INVALID_CREDENTIALS"
