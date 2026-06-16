// tests/unit/domain/User.spec.ts

import { User, UserType, UserStatus } from '../../../src/domain/entities/User';

describe('User — Domain Entity', () => {
  describe('constructor', () => {
    it('should create a user with default STUDENT type and ACTIVE status', () => {
      const user = new User({ name: 'João Silva', email: 'joao@uni.edu' });
      expect(user.getName()).toBe('João Silva');
      expect(user.getEmail()).toBe('joao@uni.edu');
      expect(user.getUserType()).toBe(UserType.STUDENT);
      expect(user.getStatus()).toBe(UserStatus.ACTIVE);
    });

    it('should normalize email to lowercase', () => {
      const user = new User({ name: 'Test', email: 'JOAO@UNI.EDU' });
      expect(user.getEmail()).toBe('joao@uni.edu');
    });

    it('should throw when email is invalid', () => {
      expect(() => new User({ name: 'Test', email: 'not-an-email' })).toThrow();
    });

    it('should trim whitespace from name', () => {
      const user = new User({ name: '  Maria  ', email: 'maria@uni.edu' });
      expect(user.getName()).toBe('Maria');
    });
  });

  describe('setPassword() / verifyPassword()', () => {
    it('should hash the password and verify correctly', async () => {
      const user = new User({ name: 'Test', email: 'test@uni.edu' });
      await user.setPassword('s3cr3tP@ss');

      expect(user.getPasswordHash()).not.toBe('s3cr3tP@ss');
      expect(await user.verifyPassword('s3cr3tP@ss')).toBe(true);
      expect(await user.verifyPassword('wrongpass')).toBe(false);
    });
  });

  describe('isActive()', () => {
    it('should return true for ACTIVE user', () => {
      const user = new User({ name: 'T', email: 't@t.com', status: UserStatus.ACTIVE });
      expect(user.isActive()).toBe(true);
    });

    it('should return false for SUSPENDED user', () => {
      const user = new User({ name: 'T', email: 't@t.com', status: UserStatus.SUSPENDED });
      expect(user.isActive()).toBe(false);
    });
  });
});

// ── RegisterUserUseCase tests ─────────────────────────────────────────────────
// tests/unit/application/RegisterUserUseCase.spec.ts

import { RegisterUserUseCase, EmailAlreadyInUseError } from '../../../src/application/use-cases/RegisterUserUseCase';
import { InMemoryUserRepository } from '../../../src/infrastructure/database/InMemoryUserRepository';

describe('RegisterUserUseCase', () => {
  let sut: RegisterUserUseCase;
  let repo: InMemoryUserRepository;

  beforeEach(() => {
    repo = new InMemoryUserRepository();
    sut  = new RegisterUserUseCase(repo);
  });

  it('should register a new user successfully', async () => {
    const result = await sut.execute({ name: 'Ana', email: 'ana@uni.edu', password: 'Pass123!' });
    expect(result.id).toBeDefined();
    expect(result.email).toBe('ana@uni.edu');
    expect(repo.count()).toBe(1);
  });

  it('should throw EmailAlreadyInUseError for duplicate email', async () => {
    await sut.execute({ name: 'Ana', email: 'ana@uni.edu', password: 'Pass123!' });
    await expect(
      sut.execute({ name: 'Ana2', email: 'ana@uni.edu', password: 'Other123!' }),
    ).rejects.toThrow(EmailAlreadyInUseError);
  });
});
