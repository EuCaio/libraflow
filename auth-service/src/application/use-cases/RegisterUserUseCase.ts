// src/application/use-cases/RegisterUserUseCase.ts

import { User } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/repositories/IUserRepository';

export interface RegisterUserDTO {
  name: string;
  email: string;
  password: string;
  userType?: string;
}

export interface UserResponseDTO {
  id: string;
  name: string;
  email: string;
  userType: string;
  status: string;
}

export class EmailAlreadyInUseError extends Error {
  readonly code = 'EMAIL_ALREADY_IN_USE';
  readonly httpStatus = 409;
  constructor(email: string) { super(`Email '${email}' is already in use`); }
}

export class RegisterUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(dto: RegisterUserDTO): Promise<UserResponseDTO> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) throw new EmailAlreadyInUseError(dto.email);

    const user = new User({ name: dto.name, email: dto.email, userType: dto.userType as any });
    await user.setPassword(dto.password);
    await this.userRepository.save(user);

    return {
      id: user.getId(),
      name: user.getName(),
      email: user.getEmail(),
      userType: user.getUserType(),
      status: user.getStatus(),
    };
  }
}
