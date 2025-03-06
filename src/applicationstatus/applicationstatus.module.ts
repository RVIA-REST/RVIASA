import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApplicationstatusService } from './applicationstatus.service';
import { Applicationstatus } from './entities/applicationstatus.entity';
import { CommonModule } from 'src/common/common.module';


@Module({
  controllers: [],
  providers: [ApplicationstatusService],
  imports: [
    TypeOrmModule.forFeature([Applicationstatus]),
    CommonModule,
  ],
  exports:[
    ApplicationstatusService
  ]
})
export class ApplicationstatusModule {}
