// tests/bdd/step-definitions/auth.steps.ts

import { Given, When, Then, Before, World } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import { InMemoryUserRepository } from '../../../src/infrastructure/database/InMemoryUserRepository';
import { RegisterUserUseCase, EmailAlreadyInUseError } from '../../../src/application/use-cases/RegisterUserUseCase';
import { LoginUseCase } from '../../../src/domain/repositories/IUserRepository';
import { UserType } from '../../../src/domain/entities/User';

interface AuthWorld extends World {
  repo: InMemoryUserRepository;
  registerUseCase: RegisterUserUseCase;
  loginUseCase: LoginUseCase;
  result: any;
  error: any;
}

Before(function (this: AuthWorld) {
  this.repo           = new InMemoryUserRepository();
  this.registerUseCase = new RegisterUserUseCase(this.repo);
  this.loginUseCase   = new LoginUseCase(this.repo, 'test-jwt-secret');
  this.result = null;
  this.error  = null;
});

Given('que não existe usuário com email {string}', function (_email: string) { /* empty repo */ });

Given('que já existe um usuário com email {string}', async function (this: AuthWorld, email: string) {
  await this.registerUseCase.execute({ name: 'Existing', email, password: 'Pass123!' });
});

Given('que existe um usuário ativo com email {string} e senha {string}',
  async function (this: AuthWorld, email: string, password: string) {
    await this.registerUseCase.execute({ name: 'Test User', email, password });
  },
);

When('eu me registro com nome {string}, email {string} e senha {string}',
  async function (this: AuthWorld, name: string, email: string, password: string) {
    try {
      this.result = await this.registerUseCase.execute({ name, email, password });
    } catch (err) { this.error = err; }
  },
);

When('eu tento me registrar novamente com email {string}',
  async function (this: AuthWorld, email: string) {
    try {
      this.result = await this.registerUseCase.execute({ name: 'Dup', email, password: 'X' });
    } catch (err) { this.error = err; }
  },
);

When('eu faço login com email {string} e senha {string}',
  async function (this: AuthWorld, email: string, password: string) {
    try {
      this.result = await this.loginUseCase.execute({ email, password });
    } catch (err) { this.error = err; }
  },
);

Then('o usuário deve ser criado com sucesso', function (this: AuthWorld) {
  assert.ok(this.result, 'Expected result but got none');
  assert.ok(this.result.id);
  assert.equal(this.error, null);
});

Then('o perfil padrão deve ser {string}', function (this: AuthWorld, userType: string) {
  assert.equal(this.result.userType, userType);
});

Then('deve ocorrer um erro com código {string}', function (this: AuthWorld, code: string) {
  assert.ok(this.error, `Expected error '${code}' but got none`);
  assert.equal((this.error as any).code, code);
});

Then('devo receber um accessToken JWT', function (this: AuthWorld) {
  assert.ok(this.result, 'Expected result');
  assert.ok(this.result.accessToken, 'Expected accessToken');
  // JWT format: header.payload.signature
  assert.ok(this.result.accessToken.split('.').length === 3, 'Invalid JWT format');
});

Then('os dados do usuário devem estar na resposta', function (this: AuthWorld) {
  assert.ok(this.result.user);
  assert.ok(this.result.user.id);
  assert.ok(this.result.user.email);
});
