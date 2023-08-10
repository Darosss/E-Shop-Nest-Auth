import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from './jwt/jwt.service';
import {
  RegisterRequestDto,
  LoginRequestDto,
  ValidateRequestDto,
} from './dto/auth.dto';
import { Auth } from './entities/auth.entity';
import {
  LoginResponse,
  ProfileResponse,
  RegisterResponse,
  ValidateResponse,
} from './pb/auth.pb';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';

@Injectable()
export class AuthService {
  @InjectRepository(Auth)
  private readonly repository: Repository<Auth>;

  @Inject(JwtService)
  private readonly jwtService: JwtService;

  public async register({
    email,
    password,
  }: RegisterRequestDto): Promise<RegisterResponse> {
    let auth: Auth = await this.repository.findOne({ where: { email } });

    if (auth) {
      throw new RpcException({
        code: status.ALREADY_EXISTS,
        message: 'E-mail already exist',
      });
    }

    auth = new Auth();

    auth.email = email;
    auth.password = this.jwtService.encodePassword(password);

    await this.repository.save(auth);

    return { status: HttpStatus.CREATED, error: null };
  }

  public async login({
    email,
    password,
  }: LoginRequestDto): Promise<LoginResponse> {
    const auth: Auth = await this.repository.findOne({ where: { email } });

    if (!auth) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Account with provided e-mail does not exist',
      });
    }

    const isPasswordValid: boolean = this.jwtService.isPasswordValid(
      password,
      auth.password,
    );

    if (!isPasswordValid) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Password wrong',
      });
    }

    const token: string = this.jwtService.generateToken(auth);

    return { token, status: HttpStatus.OK, error: null };
  }

  public async validate({
    token,
  }: ValidateRequestDto): Promise<ValidateResponse> {
    const decoded: Auth = await this.jwtService.verify(token);
    //TODO: add new rpc exceptions here
    if (!decoded) {
      return {
        status: HttpStatus.FORBIDDEN,
        error: ['Token is invalid'],
        userId: null,
      };
    }

    const auth: Auth = await this.jwtService.validateUser(decoded);
    //TODO: add new rpc exceptions here
    if (!auth) {
      return {
        status: HttpStatus.CONFLICT,
        error: ['User not found'],
        userId: null,
      };
    }
    return { status: HttpStatus.OK, error: null, userId: decoded.id };
  }
  public async profile(userId: number): Promise<ProfileResponse> {
    const profile = await this.repository.findOne({
      where: {
        id: userId,
      },
    });

    return { status: HttpStatus.OK, error: null, data: profile };
  }
}
