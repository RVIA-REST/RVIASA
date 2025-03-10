import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envs } from './config'; // Importando las variables de entorno

import { ApplicationsModule } from './applications/applications.module';
import { SourcecodeModule } from './sourcecode/sourcecode.module';
import { ScansModule } from './scans/scans.module';
import { ApplicationstatusModule } from './applicationstatus/applicationstatus.module';
import { CommonModule } from './common/common.module';
import { RviaModule } from './rvia/rvia.module';
import { CheckmarxModule } from './checkmarx/checkmarx.module';
import path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '/sysx/progs/rvia/cnf/.env',
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        console.log('Cargando configuración de la base de datos:');
        console.log('DB_HOST:', envs.dbHost);
        console.log('DB_PORT:', envs.dbPort);
        console.log('DB_NAME:', envs.dbName);

        return {
          type: 'postgres',
          host: envs.dbHost,
          port: envs.dbPort,
          database: envs.dbName,
          username: envs.dbUsername,
          password: envs.dbPassword,
          autoLoadEntities: true,
          synchronize: false,
        };
      },
    }),
    ApplicationsModule,
    SourcecodeModule,
    ScansModule,
    ApplicationstatusModule,
    CommonModule,
    RviaModule,
    CheckmarxModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
