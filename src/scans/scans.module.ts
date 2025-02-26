import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ScansService } from './scans.service';
import { ScansController } from './scans.controller';
import { Scan } from './entities/scan.entity';

@Module({
  controllers: [ScansController],
  providers: [ScansService],
  imports: [
    TypeOrmModule.forFeature([ Scan ])
  ],
  exports:[ TypeOrmModule, ScansService ]
})
export class ScansModule {}
