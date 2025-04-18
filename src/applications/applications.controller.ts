import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, BadRequestException, ParseIntPipe, Res, HttpException, HttpStatus, UploadedFiles, Request } from '@nestjs/common';
import * as fs from 'fs';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

import { ApplicationsService } from './applications.service';
import { fileFilterZip, fileNamerZip } from './helper/ZIP';

import { CreateFileDto, CreateApplicationDto } from './dto';

import { ValidationInterceptor } from '../interceptors/validation-file/validation-file.interceptor';

@Controller('RVIASA')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) { }

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
  @UploadedFiles() files: Express.Multer.File[],
  @Request() req
) {

  const userId = createFileDto.idu_usuario || null;

  if (!userId) {
    throw new BadRequestException('El campo idu_usuario es obligatorio en el body.');
  }

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

  return this.applicationsService.createFiles(createFileDto, zipOr7zFile, pdfFile, userId);
}

  
  @Get()
  findAllWithNumAccionTwo(@Request() req) {
  
      const user = req['user'];
      const userId = user?.idu_usuario ? Number(user.idu_usuario) : null;
      const userRol = user?.position?.idu_rol ? Number(user.position.idu_rol) : null;
  
  
      return this.applicationsService.findAllWithNumAccionTwo(userId, userRol);
  }
  
  

 @Get('application/:id')
async findFileZip(
  @Res() res: Response,
  @Param('id') id: number,
  @Body() body: { idu_usuario: number }
) {
  // Extraer `idu_usuario` del body
  const userId = body?.idu_usuario || null;

  if (!userId) {
    throw new BadRequestException('El campo idu_usuario es obligatorio en el body.');
  }

  await this.applicationsService.getStaticFile7z(id, res, userId);
}

}