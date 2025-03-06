import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { PositionsModule } from '../positions/positions.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  controllers: [],
  providers: [AuthService],
  imports: [
    ConfigModule,
    CommonModule,

    TypeOrmModule.forFeature([ User ]),
    forwardRef(() => PositionsModule)
  ],
  exports: [ TypeOrmModule,AuthService ]
})
export class AuthModule {}
