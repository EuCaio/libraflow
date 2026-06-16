// src/domain/entities/User.ts

import bcrypt from 'bcryptjs';

export enum UserType {
  STUDENT    = 'STUDENT',
  PROFESSOR  = 'PROFESSOR',
  RESEARCHER = 'RESEARCHER',
  ADMIN      = 'ADMIN',
}

export enum UserStatus {
  ACTIVE    = 'ACTIVE',
  INACTIVE  = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface UserProps {
  id?: string;
  name: string;
  email: string;
  passwordHash?: string;
  userType?: UserType;
  status?: UserStatus;
  createdAt?: Date;
}

export class User {
  private readonly id: string;
  private name: string;
  private readonly email: string;
  private passwordHash: string;
  private userType: UserType;
  private status: UserStatus;
  private readonly createdAt: Date;

  private static readonly SALT_ROUNDS = 12;

  constructor(props: UserProps) {
    this.validateEmail(props.email);
    this.id           = props.id ?? crypto.randomUUID();
    this.name         = props.name.trim();
    this.email        = props.email.toLowerCase().trim();
    this.passwordHash = props.passwordHash ?? '';
    this.userType     = props.userType  ?? UserType.STUDENT;
    this.status       = props.status    ?? UserStatus.ACTIVE;
    this.createdAt    = props.createdAt ?? new Date();
  }

  async setPassword(plainPassword: string): Promise<void> {
    this.passwordHash = await bcrypt.hash(plainPassword, User.SALT_ROUNDS);
  }

  async verifyPassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.passwordHash);
  }

  isActive(): boolean { return this.status === UserStatus.ACTIVE; }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`Invalid email: ${email}`);
    }
  }

  getId(): string         { return this.id; }
  getName(): string       { return this.name; }
  getEmail(): string      { return this.email; }
  getPasswordHash(): string { return this.passwordHash; }
  getUserType(): UserType { return this.userType; }
  getStatus(): UserStatus { return this.status; }
  getCreatedAt(): Date    { return this.createdAt; }
}
