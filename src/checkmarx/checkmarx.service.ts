import { BadRequestException, forwardRef, HttpException, Inject, Injectable, InternalServerErrorException, NotFoundException, StreamableFile, UnprocessableEntityException } from '@nestjs/common';
import { join } from 'path';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { rename } from 'fs/promises';
import { createReadStream, existsSync, promises as fsPromises } from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as fsExtra from 'fs-extra';
import { promises as fs } from 'fs';

import { CreateCheckmarxDto } from './dto/create-checkmarx.dto';
import { UpdateCheckmarxDto } from './dto/update-checkmarx.dto';
import { ApplicationsService } from '../applications/applications.service';
import { CommonService } from 'src/common/common.service';
import { Checkmarx } from './entities/checkmarx.entity';

import { Application } from 'src/applications/entities/application.entity';
import { ApplicationstatusService } from 'src/applicationstatus/applicationstatus.service';
import { ErrorRVIA } from 'src/rvia/helpers/errors-rvia';
import { ConfigService } from '@nestjs/config';
import { RviaService } from 'src/rvia/rvia.service';

const addon = require(process.env.RVIA_PATH);

@Injectable()
export class CheckmarxService {

  private readonly crviaEnvironment: number;

  constructor(

    @InjectRepository(Checkmarx)
    private readonly checkmarxRepository: Repository<Checkmarx>,
    @Inject(forwardRef(() => ApplicationsService)) // Usamos forwardRef aquí
    private readonly applicationService: ApplicationsService,
    private readonly encryptionService: CommonService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => RviaService))
    private readonly rviaService: RviaService,

  ) {
    this.crviaEnvironment = Number(this.configService.get('RVIA_ENVIRONMENT'));
  }

  async create(createCheckmarxDto: CreateCheckmarxDto, file) {

    try {

      const aplicacion = await this.applicationService.findOne(createCheckmarxDto.idu_aplicacion);
      const nom_aplicacion = this.encryptionService.decrypt(aplicacion.nom_aplicacion);
      const fileName = `checkmarx_${aplicacion.idu_proyecto}_${nom_aplicacion}.csv`;
      const finalFilePath = join(`/sysx/bito/projects/${aplicacion.idu_proyecto}_${nom_aplicacion}`, fileName);

      await rename(`/sysx/bito/projects/${file.filename}`, finalFilePath);  
 
      const checkmarx = new Checkmarx();
      checkmarx.nom_checkmarx = this.encryptionService.encrypt(fileName);
      checkmarx.nom_directorio = this.encryptionService.encrypt(finalFilePath);
      checkmarx.application = aplicacion;

      await this.checkmarxRepository.save(checkmarx); 

      checkmarx.nom_checkmarx = this.encryptionService.decrypt(checkmarx.nom_checkmarx);
      checkmarx.nom_directorio = this.encryptionService.decrypt(checkmarx.nom_directorio);

      return checkmarx;

    } catch (error) {
      throw new InternalServerErrorException('Error al subir csv', error.message);
    }

  }

  async convertPDF(createCheckmarxDto: CreateCheckmarxDto, file) {

    try {
      const obj = new addon.CRvia(this.crviaEnvironment);
      let rviaProcess: { isValidProcess:boolean, messageRVIA:string };
      const aplicacion = await this.applicationService.findOne(createCheckmarxDto.idu_aplicacion);

      if(aplicacion.num_accion != 2)
        throw new UnprocessableEntityException(` La aplicación debe tener la acción de Sanitización `);

      const pdfFileRename = await this.moveAndRenamePdfFile( file, aplicacion );
      const res = await this.callPython( aplicacion.nom_aplicacion, pdfFileRename, aplicacion );

      if( res.isValid ){
        rviaProcess = await this.rviaService.ApplicationInitProcess(aplicacion, obj);
      }else{

        rviaProcess = { isValidProcess:res.isValid, messageRVIA: res.message  };
      }

      const responseConvert = { ...res, ...rviaProcess };

      return responseConvert;
      
    } catch (error) {


      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new InternalServerErrorException('Error al subir CSV', error.message);
      }

      // throw new InternalServerErrorException('Error al subir csv', error.message);
    }

  }

  async findOneByApplication(id: number) {

    const aplicacion = await this.applicationService.findOne(id);

    const checkmarx = await this.checkmarxRepository.findOneBy({ application: aplicacion });

    // if(!checkmarx)
    //   throw new NotFoundException(`Csv no encontrado `);
    if(checkmarx){
      checkmarx.nom_checkmarx = this.encryptionService.decrypt(checkmarx.nom_checkmarx);
      checkmarx.nom_directorio = this.encryptionService.decrypt(checkmarx.nom_directorio);
    }


    return !checkmarx ? [] : checkmarx;
  }

  async downloadCsvFile(id: number, response): Promise<void> {

    const checkmarx = await this.checkmarxRepository.findOneBy({ idu_checkmarx:id });

    if (!checkmarx) {
      throw new NotFoundException('Archivo no encontrado');
    }
    
    checkmarx.nom_checkmarx = this.encryptionService.decrypt(checkmarx.nom_checkmarx);
    checkmarx.nom_directorio = this.encryptionService.decrypt(checkmarx.nom_directorio);

    const filePath = join(checkmarx.nom_directorio);

    if (!existsSync(filePath)) {
      throw new NotFoundException('El archivo no existe en el servidor');
    }

    response.setHeader('Content-Type', 'text/csv');
    response.setHeader('Content-Disposition', `attachment; filename="${checkmarx.nom_checkmarx}"`);

    const fileStream = createReadStream(filePath);

    fileStream.on('error', (error) => {
      console.error('Error al leer el archivo:', error);
      response.status(500).send('Error al leer el archivo');
    });

    fileStream.pipe(response);
  }

  async callPython(nameApplication:string, namePdf:string, application: Application){

    const scriptPath = join(__dirname, '../..', 'src/python-scripts','recovery.py');

    const execPromise = promisify(exec);
    const nom_aplicacion = this.encryptionService.decrypt(application.nom_aplicacion);

    const fileName = `checkmarx_${application.idu_proyecto}_${nom_aplicacion}.csv`;
    const finalFilePath = join(`/sysx/bito/projects/${application.idu_proyecto}_${nom_aplicacion}`, fileName);
    
    try {
      await fsPromises.access(scriptPath, fsPromises.constants.F_OK | fsPromises.constants.R_OK);

      const escapedFileName1 = `"${nom_aplicacion.replace(/"/g, '\\"')}"`;
      const escapedFileName2 = `"${namePdf.replace(/"/g, '\\"')}"`;
  
      const command = `python3 ${scriptPath} ${escapedFileName1} ${escapedFileName2} ${application.idu_proyecto}`;
  
      const { stdout, stderr } = await execPromise(command);

      if (stderr) {
        return { message: 'Error al ejecutar el script.', error: stderr, isValid:false };
      }

      const checkmarx = new Checkmarx();
      checkmarx.nom_checkmarx = this.encryptionService.encrypt(fileName);
      checkmarx.nom_directorio = this.encryptionService.encrypt(finalFilePath);
      checkmarx.application = application;

      await this.checkmarxRepository.save(checkmarx);

      checkmarx.nom_checkmarx = this.encryptionService.decrypt(checkmarx.nom_checkmarx);
  
      // return checkmarx;
      return { message: 'CSV Generado', isValid:true, checkmarx };
    } catch (error) {
    
      return { message: 'Error al ejecutar el script.', error, isValid:false };
    }
  }

  private async moveAndRenamePdfFile(pdfFile: Express.Multer.File, application:Application): Promise<string> {

    const nom_aplicacion = this.encryptionService.decrypt(application.nom_aplicacion);
    const dir_aplicacion = this.encryptionService.decrypt(application.sourcecode.nom_directorio);

    const newPdfFileName = `checkmarx_${application.idu_proyecto}_${nom_aplicacion}.pdf`;
    const newPdfFilePath = join(dir_aplicacion, newPdfFileName);
  
    try {

      if (await fs.access(newPdfFilePath).then(() => true).catch(() => false)) {
        await fs.unlink(newPdfFilePath);
      }

      await fsExtra.move(pdfFile.path, newPdfFilePath); // Mueve y renombra el archivo
      return newPdfFileName; // Devuelve el nuevo nombre del archivo

    } catch (error) {

      throw new InternalServerErrorException(`Error al mover y renombrar el archivo PDF: ${error.message}`);
    }
  }

}
