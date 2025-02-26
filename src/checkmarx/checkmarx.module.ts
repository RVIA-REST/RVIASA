import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CheckmarxService } from './checkmarx.service';
import { CheckmarxController } from './checkmarx.controller';
import { Checkmarx } from './entities/checkmarx.entity';
import { ApplicationsModule } from 'src/applications/applications.module';
import { CommonModule } from 'src/common/common.module';
import { RviaModule } from 'src/rvia/rvia.module';

@Module({
  controllers: [CheckmarxController],
  providers: [CheckmarxService],
  imports:[ 
    TypeOrmModule.forFeature([ Checkmarx ]),
    forwardRef(() => ApplicationsModule),
    CommonModule,
    forwardRef(() => RviaModule),
  ],
  exports:[ 
    CheckmarxService, 
    TypeOrmModule 
  ]
})
export class CheckmarxModule {}
