import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, BadRequestException, ParseIntPipe, Res, HttpException, HttpStatus, UploadedFiles } from '@nestjs/common';
import * as fs from 'fs';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

import { ApplicationsService } from './applications.service';
import { fileFilterZip, fileNamerZip } from './helper/ZIP';

import { CreateFileDto, CreateApplicationDto } from './dto';

import { ValidationInterceptor } from '../interceptors/validation-file/validation-file.interceptor';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) { }

  @Get()
  findAll() {
    const userId = 1; // Ajuste para enviar userId
    return this.applicationsService.findAll(userId);
  }

  @Post('git')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: fileFilterZip,
    storage: diskStorage({
      destination: (req, file, cb) => {
        const dir = `/sysx/bito/projects`;
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: fileNamerZip
    })
  }),
  new ValidationInterceptor((dto: CreateApplicationDto) => true))
  create(@Body() createApplicationDto: CreateApplicationDto, @UploadedFile() file: Express.Multer.File) {
    const userId = 1; // Reemplazar por el userId dinámico si es necesario
    return this.applicationsService.createGitFile(createApplicationDto, userId, file);
  }

  @Post('gitlab')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: fileFilterZip,
    storage: diskStorage({
      destination: (req, file, cb) => {
        const dir = `/sysx/bito/projects`;
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: fileNamerZip
    })
  }),
  new ValidationInterceptor((dto: CreateApplicationDto) => true))
  createGitLab(@Body() createApplicationDto: CreateApplicationDto, @UploadedFile() file: Express.Multer.File) {
    const userId = 1;
    return this.applicationsService.createGitLabFile(createApplicationDto, userId, file);
  }

  @Post('files')
  @UseInterceptors(FilesInterceptor('files', 2, {
    fileFilter: fileFilterZip,
    storage: diskStorage({
      destination: (req, file, cb) => {
        const dir = `/sysx/bito/projects`;
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: fileNamerZip
    })
  }),
  new ValidationInterceptor((dto: CreateFileDto) => true))
  uploadFileZip(
    @Body() createFileDto: CreateFileDto,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    if (files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const zipOr7zFile = files.find(file => 
      file.mimetype.includes('zip') || file.mimetype.includes('x-7z-compressed') || file.mimetype.includes('x-zip-compressed')
    );
    const pdfFile = files.find(file => file.mimetype.includes('pdf'));

    if (!zipOr7zFile) {
      throw new BadRequestException('Debe tener un archivo zip o 7z y un PDF');
    }

    return this.applicationsService.createFiles(createFileDto, zipOr7zFile, pdfFile);
  }
  
  @Get('status/num-accion-2')
  findAllWithNumAccionTwo() {
  const userId = 1;  // 🔹 Aquí puedes cambiarlo si necesitas un userId dinámico
  return this.applicationsService.findAllWithNumAccionTwo(userId);
}


  @Get('zip/:id')
  async findFileZip(
    @Res() res: Response,
    @Param('id') id: number
  ) {
    await this.applicationsService.getStaticFile7z(id, res);
  }
}