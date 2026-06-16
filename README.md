# LibraFlow 📚 — Sistema de Gerenciamento de Biblioteca Digital

Sistema de Gerenciamento de Biblioteca Digital desenvolvido com arquitetura de microsserviços, demonstrando de forma prática e justificada o uso de **Clean Architecture, SOLID, Design Patterns, TDD, BDD, Docker e Deploy**.

---

## 1. Descrição do Problema Escolhido

O projeto LibraFlow propõe uma solução de software para os desafios inerentes ao gerenciamento de uma **biblioteca digital**. Em um cenário de digitalização crescente, instituições enfrentam a necessidade de modernizar seus sistemas para oferecer eficiência e escalabilidade. Os problemas abordados incluem:

*   **Gestão ineficiente de acervo:** Dificuldade em catalogar e pesquisar grandes volumes de livros.
*   **Processos manuais:** Controle de empréstimos e renovações propenso a falhas humanas.
*   **Falta de escalabilidade:** Sistemas monolíticos que não suportam o crescimento do número de usuários.
*   **Dificuldade de integração:** Isolamento de funcionalidades como autenticação e notificações.
*   **Ausência de relatórios:** Dificuldade em gerar métricas para tomada de decisões estratégicas.

O LibraFlow resolve esses problemas através de um sistema distribuído focado em modularidade e manutenibilidade.

---

## 2. 🏗️ Arquitetura do Sistema

O sistema é composto por 5 microsserviços independentes, cada um com seu próprio banco de dados, seguindo os princípios da **Arquitetura Limpa (Clean Architecture)**.

```
libraflow/
├── auth-service          # Autenticação e JWT (porta 3001)
├── catalog-service       # Catálogo de livros  (porta 3002)
├── loan-service          # Empréstimos         (porta 3003)
├── notification-service  # Notificações        (porta 3004)
├── report-service        # Relatórios          (porta 3005)
├── nginx/                # API Gateway (Porta 80)
├── scripts/              # Scripts de inicialização (Postgres DBs)
├── rabbitmq/             # Broker de mensagens
├── .github/workflows/    # CI/CD (GitHub Actions)
├── docker-compose.yml    # Orquestração local de containers
└── render.yaml           # Blueprint de deploy para o Render
```

### Camadas de cada Microsserviço:
1.  **Domain:** Entidades de negócio e interfaces (independente de frameworks).
2.  **Application:** Casos de uso (Use Cases) que orquestram a lógica de negócio.
3.  **Infrastructure:** Implementações técnicas (DBs, APIs, Mensageria).
4.  **Presentation:** Controladores HTTP (Fastify/Express) e rotas.

---

## 3. 🏛️ Conceitos e Justificativas Técnicas

Abaixo, detalhamos como cada requisito da prova foi aplicado no LibraFlow:

| Conceito | Justificativa e Implementação |
| :--- | :--- |
| **Microsserviços** | Divisão em 5 serviços para garantir escalabilidade independente e isolamento de falhas. |
| **Clean Architecture** | Separação em camadas para garantir que a regra de negócio não dependa de tecnologias externas. |
| **Clean Code** | Uso de nomes expressivos, funções pequenas e tratamento de erros semântico em todo o projeto. |
| **TDD** | Testes unitários (`tests/unit`) criados antes da implementação para garantir robustez e design limpo. |
| **BDD** | Cenários Gherkin (`tests/bdd`) que descrevem o comportamento do sistema em linguagem natural. |
| **Docker** | Uso de `Dockerfile` multistage e `docker-compose.yml` para garantir ambiente idêntico em dev e prod. |
| **SOLID: SRP** | Cada classe tem uma única responsabilidade (ex: `Loan` gerencia estado, `LoanRepository` gerencia dados). |
| **SOLID: OCP** | Uso de interfaces (ex: `INotificationChannel`) permite adicionar novos canais sem alterar o código existente. |
| **SOLID: LSP** | Repositórios em memória e Prisma são intercambiáveis sem quebrar os casos de uso. |
| **SOLID: ISP** | Interfaces específicas e enxutas (ex: `ICatalogClient` define apenas o necessário para o serviço de catálogo). |
| **SOLID: DIP** | Casos de uso dependem de abstrações (interfaces) e não de implementações concretas. |

### Design Patterns Aplicados (Mínimo 4):
1.  **Repository:** Abstrai a persistência (ex: `IBookRepository`, `PrismaLoanRepository`).
2.  **Factory:** `NotificationFactory` centraliza a criação de diferentes tipos de notificações.
3.  **Decorator:** `CachedBookRepository` adiciona cache Redis de forma transparente ao repositório de livros.
4.  **Builder:** `ReportQueryBuilder` facilita a construção de consultas complexas para relatórios.
5.  **Strategy:** `INotificationChannel` permite trocar a forma de envio (E-mail, SMS) dinamicamente.
6.  **Observer:** `RabbitMQConsumer` reage a eventos de domínio publicados por outros serviços.

---

## 4. 🚀 Rodando localmente

### Pré-requisitos
- Docker 24+ e Docker Compose v2+
- Node.js 20+ (opcional, para rodar testes fora do Docker)

### Passo a Passo
1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/seu-usuario/libraflow.git
    cd libraflow
    ```
2.  **Configure o ambiente:**
    ```bash
    cp .env.example .env
    ```
3.  **Suba os containers:**
    ```bash
    docker compose up --build -d
    ```
4.  **Acesse o sistema:**
    *   **API Gateway:** [http://localhost](http://localhost)
    *   **Documentação (Swagger):** [http://localhost/api-docs](http://localhost/api-docs)

---

## 5. 🧪 Testes (TDD e BDD)

Para rodar os testes de um serviço específico (ex: `loan-service`):
```bash
cd loan-service
npm install
npm run test:unit       # Testes Unitários (TDD)
npm run test:bdd        # Testes de Comportamento (BDD)
npm run test:coverage   # Relatório de Cobertura
```

---

## 6. 📡 Deploy e Link de Acesso

O sistema está publicado e ativo na plataforma **Render**, com deploy automatizado via **GitHub Actions** e configuração declarativa pelo arquivo `render.yaml`.

*   **URL da API:** [https://libraflow.onrender.com](https://libraflow.onrender.com)
*   **Documentação Interativa:** [https://libraflow.onrender.com/api-docs](https://libraflow.onrender.com/api-docs)

---
