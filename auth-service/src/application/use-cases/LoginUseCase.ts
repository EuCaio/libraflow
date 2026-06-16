// src/application/use-cases/LoginUseCase.ts

import { IUserRepository } from '../../domain/repositories/IUserRepository';
import jwt from 'jsonwebtoken';

export interface LoginDTO { email: string; password: string; }
export interface TokenResponseDTO { accessToken: string; expiresIn: string; user: { id: string; name: string; email: string; userType: string; }; }

class InvalidCredentialsError extends Error {
  readonly code = 'INVALID_CREDENTIALS';
  readonly httpStatus = 401;
  constructor() { super('Invalid email or password'); }
}

class UserInactiveError extends Error {
  readonly code = 'USER_INACTIVE';
  readonly httpStatus = 403;
  constructor() { super('User account is not active'); }
}

export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtSecret: string,
    private readonly jwtExpiresIn: string = '7d',
  ) {}

  async execute(dto: LoginDTO): Promise<TokenResponseDTO> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) throw new InvalidCredentialsError();

    const passwordValid = await user.verifyPassword(dto.password);
    if (!passwordValid) throw new InvalidCredentialsError();

    if (!user.isActive()) throw new UserInactiveError();

    const accessToken = jwt.sign(
      { sub: user.getId(), email: user.getEmail(), userType: user.getUserType() },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn } as any,
    );

    return {
      accessToken,
      expiresIn: this.jwtExpiresIn,
      user: {
        id: user.getId(),
        name: user.getName(),
        email: user.getEmail(),
        userType: user.getUserType(),
      },
    };
  }
}
