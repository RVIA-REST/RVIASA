import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SourcecodeService } from './sourcecode.service';
import { SourcecodeController } from './sourcecode.controller';
import { Sourcecode } from './entities/sourcecode.entity';

@Module({
  controllers: [SourcecodeController],
  providers: [SourcecodeService],
  imports: [
    TypeOrmModule.forFeature([ Sourcecode ])
  ],
  exports:[
    SourcecodeService
  ]
})
export class SourcecodeModule {}
