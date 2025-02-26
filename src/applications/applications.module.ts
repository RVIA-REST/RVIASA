import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { Application } from './entities/application.entity';
import { ApplicationstatusModule } from '../applicationstatus/applicationstatus.module';
import { SourcecodeModule } from '../sourcecode/sourcecode.module';


import { CommonModule } from 'src/common/common.module';
import { ScansModule } from 'src/scans/scans.module';
import { CheckmarxModule } from 'src/checkmarx/checkmarx.module';
import { RviaModule } from 'src/rvia/rvia.module';

@Module({
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  imports:[
    TypeOrmModule.forFeature([ Application ]),
    ApplicationstatusModule,
    SourcecodeModule,
    HttpModule,
    CommonModule,
    ScansModule,
    forwardRef(() => CheckmarxModule),
    forwardRef(() => RviaModule),
  ],
  exports:[ ApplicationsService,TypeOrmModule ]
})
export class ApplicationsModule {}
