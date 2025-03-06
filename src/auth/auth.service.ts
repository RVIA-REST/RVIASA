import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { PositionsService } from '../positions/positions.service';
import { CommonService } from 'src/common/common.service';



@Injectable()
export class AuthService {

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly positionService: PositionsService,
    private readonly encryptionService: CommonService
  ) {}
  async validateUser(id_usuario: number): Promise<any> {

    const user = await this.userRepository.findOneBy({ idu_usuario:String(id_usuario) });
    
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return user;
  }

  }