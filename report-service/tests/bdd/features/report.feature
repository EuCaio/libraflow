# tests/bdd/features/report.feature

Feature: Geração de Relatórios
  Como administrador da biblioteca
  Eu quero gerar relatórios de uso
  Para acompanhar os indicadores da biblioteca

  Scenario: Geração de relatório mensal com métricas completas
    Given que existem dados de empréstimos nos últimos 30 dias
    When eu gero um relatório do mês atual com todas as métricas
    Then o relatório deve conter dados agrupados por semana
    And o relatório deve incluir o total de empréstimos
    And o relatório deve incluir a taxa de atraso

  Scenario: Falha ao gerar relatório sem período definido
    When eu tento gerar um relatório sem especificar o período
    Then deve ocorrer um erro com mensagem "Period is required"

  Scenario: Falha ao gerar relatório com datas invertidas
    When eu tento gerar um relatório com data de início após a data de fim
    Then deve ocorrer um erro com mensagem "startDate must be before endDate"
