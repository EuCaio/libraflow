// src/infrastructure/database/InMemoryUserRepository.ts

import { User } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/repositories/IUserRepository';

export class InMemoryUserRepository implements IUserRepository {
  private users = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return Array.from(this.users.values()).find(u => u.getEmail() === email.toLowerCase()) ?? null;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.getId(), user);
  }

  async update(user: User): Promise<void> {
    this.users.set(user.getId(), user);
  }

  count(): number { return this.users.size; }
  clear(): void   { this.users.clear(); }
}
