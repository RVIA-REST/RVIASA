import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, BadRequestException, Res, StreamableFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import { diskStorage } from 'multer';


import { CheckmarxService } from './checkmarx.service';
import { ErrorOptionApplication, CreateCheckmarxDto, UpdateCheckmarxDto, ErrorPDFFile, SuccessResponse } from './dto';

import { fileFilter, fileNamer } from './helper';

import { Response } from 'express';
import { fileFilterPDF } from './helper/fileFilterpdf';
import { ValidationInterceptor } from '../interceptors/validation-file/validation-file.interceptor';
import { Checkmarx } from './entities/checkmarx.entity';


@Controller('checkmarx')
export class CheckmarxController {
  constructor(private readonly checkmarxService: CheckmarxService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: (req, file, cb) => {
      const ext = file.originalname.split('.').pop();
      if (file.mimetype === 'text/csv' && ext === 'csv') {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type'), false);
      }
    },
    storage: diskStorage({
      destination: (req, file, cb) => {
        const dir = `/sysx/bito/projects`;
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: fileNamer
    })
  }),
  new ValidationInterceptor((dto: CreateCheckmarxDto) => {
    // Implement DTO validation logic here
    return true; // Replace with actual validation
  }))
  async create(@Body() createCheckmarxDto: CreateCheckmarxDto, @UploadedFile() file: Express.Multer.File) {

    if ( !file ) {
      throw new BadRequestException('Debes cargar un archivo Csv');
    }

    return this.checkmarxService.create(createCheckmarxDto, file);
  }

  @Post('recoverypdf')
  
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: fileFilterPDF,
    storage: diskStorage({
      destination: (req, file, cb) => {
        const dir = `/sysx/bito/projects`;
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: fileNamer
    })
  }),
  new ValidationInterceptor((dto: CreateCheckmarxDto) => {
    // Implement DTO validation logic here
    return true; // Replace with actual validation
  }))
  async uploadPDF(@Body() createCheckmarxDto: CreateCheckmarxDto, @UploadedFile() file: Express.Multer.File) {

    if ( !file ) {
      throw new BadRequestException('Debes cargar un archivo PDF');
    }

    return this.checkmarxService.convertPDF(createCheckmarxDto, file);
  }

  @Post('upload-pdf')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: fileFilterPDF,
    storage: diskStorage({
      destination: (req, file, cb) => {
        const dir = `/sysx/bito/projects`;
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: fileNamer
    })
  }),
  new ValidationInterceptor((dto: CreateCheckmarxDto) => {
    // Implement DTO validation logic here
    return true; // Replace with actual validation
  }))
  async uploadPDFList(@Body() createCheckmarxDto: CreateCheckmarxDto, @UploadedFile() file: Express.Multer.File) {

    if ( !file ) {
      throw new BadRequestException('Debes cargar un archivo PDF');
    }

    return this.checkmarxService.convertPDF(createCheckmarxDto, file);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.checkmarxService.findOneByApplication(id);
  }

  @Get('download/:id')
  downloadCsv(@Param('id') id: number, @Res() res: Response) {
    return this.checkmarxService.downloadCsvFile(id,res);
  }

}
