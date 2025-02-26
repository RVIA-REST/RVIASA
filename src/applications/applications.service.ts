import { BadRequestException, forwardRef, Inject, Injectable, InternalServerErrorException, Logger, NotFoundException, UnsupportedMediaTypeException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { createReadStream, createWriteStream, existsSync } from 'fs';
import { catchError, lastValueFrom } from 'rxjs';
import { join } from 'path';
import * as unzipper from 'unzipper';
import * as seven from '7zip-min';
import { v4 as uuid } from 'uuid';
import { promisify } from 'util';
import { pipeline } from 'stream';
import * as fsExtra from 'fs-extra';
import { promises as fs } from 'fs';
import { CreateApplicationDto, CreateFileDto } from './dto';
import { Application } from './entities/application.entity';
import { ApplicationstatusService } from '../applicationstatus/applicationstatus.service';
import { SourcecodeService } from '../sourcecode/sourcecode.service';
import { CommonService } from 'src/common/common.service';
import { Scan } from 'src/scans/entities/scan.entity';
import { CheckmarxService } from 'src/checkmarx/checkmarx.service';
import { ConfigService } from '@nestjs/config';
import { RviaService } from 'src/rvia/rvia.service';

const addon = require(process.env.RVIA_PATH);

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger('ApplicationsService');
  private downloadPath = '/sysx/bito/projects';
  private readonly crviaEnvironment: number;

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly estatusService: ApplicationstatusService,
    private readonly sourcecodeService: SourcecodeService,
    private readonly httpService: HttpService,
    private readonly encryptionService: CommonService,
    @InjectRepository(Scan)
    private scanRepository: Repository<Scan>,
    @Inject(forwardRef(() => CheckmarxService))
    private readonly checkmarxService: CheckmarxService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => RviaService))
    private readonly rviaService: RviaService,
  ) {
    this.crviaEnvironment = Number(this.configService.get('RVIA_ENVIRONMENT'));
  }

  async findAll(userId: number) {
    try {
      const queryBuilder = this.applicationRepository.createQueryBuilder('application')
        .leftJoinAndSelect('application.checkmarx', 'checkmarx')
        .leftJoinAndSelect('application.applicationstatus', 'applicationstatus')
        .leftJoinAndSelect('application.sourcecode', 'sourcecode')
        .where('application.idu_usuario = :userId', { userId })
        .orderBy('application.fec_creacion', 'ASC');

      const aplicaciones = await queryBuilder.getMany();

      aplicaciones.forEach((aplicacion, index) => {
        aplicacion.nom_aplicacion = this.encryptionService.decrypt(aplicacion.nom_aplicacion);
        aplicacion.applicationstatus.des_estatus_aplicacion = this.encryptionService.decrypt(aplicacion.applicationstatus.des_estatus_aplicacion);
        aplicacion.sourcecode.nom_codigo_fuente = this.encryptionService.decrypt(aplicacion.sourcecode.nom_codigo_fuente);
        aplicacion.sourcecode.nom_directorio = this.encryptionService.decrypt(aplicacion.sourcecode.nom_directorio);
        (aplicacion as any).sequentialId = index + 1;

        if (aplicacion.checkmarx && aplicacion.checkmarx.length > 0) {
          aplicacion.checkmarx.forEach(checkmarx => {
            checkmarx.nom_checkmarx = this.encryptionService.decrypt(checkmarx.nom_checkmarx);
          });
        }
      });

      return aplicaciones;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findOne(id: number) {
    const aplicacion = await this.applicationRepository.findOneBy({ idu_aplicacion: id });

    if (!aplicacion)
      throw new NotFoundException(`Aplicación con ID ${id} no encontrada`);

    return aplicacion;
  }

  async createGitFile(createApplicationDto: CreateApplicationDto, userId: number, file?) {
    try {
      const repoInfo = this.parseGitHubURL(createApplicationDto.url);
      if (!repoInfo) {
        throw new BadRequestException('Invalid GitHub repository URL');
      }

      return await this.processRepository(repoInfo.repoName, repoInfo.userName, file, createApplicationDto.num_accion, createApplicationDto.opc_lenguaje, 'GitHub', createApplicationDto.opc_arquitectura);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async createGitLabFile(createApplicationDto: CreateApplicationDto, userId: number, file?) {
    try {
      const repoInfo = this.getRepoInfo(createApplicationDto.url);
      if (!repoInfo) {
        throw new BadRequestException('Invalid GitLab repository URL');
      }

      return await this.processRepository(repoInfo.repoName, `${repoInfo.userName}/${repoInfo.groupName}`, file, createApplicationDto.num_accion, createApplicationDto.opc_lenguaje, 'GitLab', createApplicationDto.opc_arquitectura);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  private async processRepository(repoName: string, repoUserName: string, file, numAccion: number, opcLenguaje: number, platform: string, opcArquitectura) {

    const obj = new addon.CRvia(this.crviaEnvironment);
    const iduProject = obj.createIDProject();

    const streamPipeline = promisify(pipeline);
    const uniqueTempFolderName = `temp-${uuid()}`;
    const tempFolderPath = join(this.downloadPath, uniqueTempFolderName);
    const repoFolderPath = join(this.downloadPath, `${iduProject}_${repoName}`);


    const isSanitizacion = numAccion == 2 ? true : false;
    let dataCheckmarx: { message: string; error?: string; isValid?: boolean; checkmarx?: any };
    let rviaProcess: { isValidProcess:boolean, messageRVIA:string };

    if( isSanitizacion  && !file ){
      throw new BadRequestException("Es necesario subir el PDF");
    }

    if( numAccion == 0 && !opcArquitectura )
      throw new BadRequestException("Es necesario seleccionar una opción de arquitectura");

    await fsExtra.ensureDir(tempFolderPath);

    const branches = ['main', 'master'];
    let zipUrl: string | null = null;

    for (const branch of branches) {
      const potentialUrl = platform === 'GitHub'
        ? `https://github.com/${repoUserName}/${repoName}/archive/refs/heads/${branch}.zip`
        : `https://gitlab.com/${repoUserName}/${repoName}/-/archive/${branch}/${repoName}-${branch}.zip`;

      try {
        await lastValueFrom(this.httpService.head(potentialUrl));
        zipUrl = potentialUrl;
        break;
      } catch (error) {
        continue;
      }
    }

    if (!zipUrl) {
      await fsExtra.remove(tempFolderPath);
      await fsExtra.remove(file.path);
      throw new InternalServerErrorException('No se encontró ninguna rama válida (main o master)');
    }

    const response = await lastValueFrom(
      this.httpService.get(zipUrl, { responseType: 'stream' }).pipe(
        catchError(() => {
          fsExtra.remove(tempFolderPath);

          throw new InternalServerErrorException('Error al descargar el repositorio');
        }),
      ),
    );

    const tempZipPath = join(tempFolderPath, `${repoName}.zip`);
    const zipGit = join(this.downloadPath, `${iduProject}_${repoName}.zip`);
   

    try {

      await streamPipeline(response.data, createWriteStream(tempZipPath));

      await fsExtra.copy(tempZipPath, zipGit);

      await unzipper.Open.file(tempZipPath)
        .then(d => d.extract({ path: tempFolderPath }))
        .then(async () => {
          // Obtener el nombre del directorio extraído
          const extractedFolders = await fsExtra.readdir(tempFolderPath);
          const extractedFolder = join(tempFolderPath, extractedFolders.find(folder => folder.includes(repoName)));

          await fsExtra.ensureDir(repoFolderPath);
          await fsExtra.copy(extractedFolder, repoFolderPath);
          await fsExtra.remove(tempZipPath);
          await fsExtra.remove(tempFolderPath);
        });

      const sourcecode = await this.sourcecodeService.create({
        nom_codigo_fuente: this.encryptionService.encrypt(repoName),
        nom_directorio: this.encryptionService.encrypt(repoFolderPath),
      });

      const estatu = await this.estatusService.findOne(2);
      const application = new Application();
      application.nom_aplicacion = this.encryptionService.encrypt(repoName);
      application.idu_proyecto = iduProject;
      application.num_accion = numAccion;
      application.opc_arquitectura = opcArquitectura || {"1": false, "2": false, "3": false, "4": false};
      application.opc_lenguaje = opcLenguaje;
      application.opc_estatus_doc = opcArquitectura['1'] ? 2 : 0;
      application.opc_estatus_doc_code = opcArquitectura['2'] ? 2 : 0;
      application.opc_estatus_caso = opcArquitectura['3'] ? 2 : 0;
      application.opc_estatus_calificar = opcArquitectura['4'] ? 2 : 0;
      application.applicationstatus = estatu;
      application.sourcecode = sourcecode;
      application.idu_usuario = 1;

      await this.applicationRepository.save(application);

      if (file) {

        const pdfFileRename = await this.moveAndRenamePdfFile(file, repoFolderPath, repoName, iduProject);

        if (isSanitizacion) {
          dataCheckmarx = await this.checkmarxService.callPython(application.nom_aplicacion, pdfFileRename, application);
          if (dataCheckmarx.isValid) {
            const scan = new Scan();
            scan.nom_escaneo = this.encryptionService.encrypt(pdfFileRename);
            scan.nom_directorio = this.encryptionService.encrypt(join(repoFolderPath, pdfFileRename));
            scan.application = application;
            await this.scanRepository.save(scan);

            rviaProcess = await this.rviaService.ApplicationInitProcess(application, obj);

          } else {
            await fsExtra.remove(join(repoFolderPath, pdfFileRename));
          }
        }

        if (numAccion != 2) {
          const scan = new Scan();
          scan.nom_escaneo = this.encryptionService.encrypt(pdfFileRename);
          scan.nom_directorio = this.encryptionService.encrypt(join(repoFolderPath, pdfFileRename));
          scan.application = application;
          await this.scanRepository.save(scan);
        }

      }

      if( numAccion != 2 ){
        rviaProcess = await this.rviaService.ApplicationInitProcess(application, obj);
      }

      application.nom_aplicacion = this.encryptionService.decrypt(application.nom_aplicacion);

      return {
        application,
        checkmarx: isSanitizacion && file ? dataCheckmarx.checkmarx : [],
        esSanitizacion: isSanitizacion,
        rviaProcess
      };

    } catch (error) {
      await fsExtra.remove(repoFolderPath);
      await fsExtra.remove(zipGit);
      throw new InternalServerErrorException('Error al procesar el repositorio');
    } finally {
      await fsExtra.remove(tempFolderPath);
      await fsExtra.remove(tempZipPath);
    }
  }
  async createFiles(createFileDto: CreateFileDto, zipFile: Express.Multer.File, pdfFile: Express.Multer.File | undefined) {

    const obj = new addon.CRvia(this.crviaEnvironment);
    const iduProject = obj.createIDProject();
    const tempExtension = zipFile.originalname.split('.');

    const nameApplication = tempExtension.slice(0,-1).join('.').replace(/\s+/g, '-');
    const uniqueTempFolderName = `temp-${uuid()}`;
    const tempFolderPath = join(zipFile.destination, uniqueTempFolderName);
    const tempZipPath = join(tempFolderPath, zipFile.filename);
    const repoFolderPath = join(zipFile.destination, `${iduProject}_${nameApplication}`);
    const isSanitizacion = createFileDto.num_accion == 2 ? true : false;
    let dataCheckmarx: { message: string; error?: string; isValid?: boolean; checkmarx?: any };
    let rviaProcess: { isValidProcess:boolean, messageRVIA:string };

    try {

      if( isSanitizacion  && !pdfFile ){
        throw new BadRequestException("Es necesario subir el PDF");
      }

      const estatu = await this.estatusService.findOne(2);
      if (!estatu) throw new NotFoundException('Estatus no encontrado');

      if( createFileDto.num_accion == 0 && !createFileDto.opc_arquitectura )
        throw new BadRequestException("Es necesario seleccionar una opción de arquitectura");

      await fsExtra.ensureDir(tempFolderPath);
      await fsExtra.move(zipFile.path, tempZipPath);

      // Verifica si el archivo se movió correctamente
      const fileExists = await fsExtra.pathExists(tempZipPath);
      if (!fileExists) {
        throw new InternalServerErrorException(`El archivo no se movió correctamente a ${tempZipPath}`);
      }

      try {
        let extractedFolders: string[] = [];
        if (zipFile.mimetype === 'application/zip' || zipFile.mimetype === 'application/x-zip-compressed') {
          // Descomprimir archivo .zip
          await unzipper.Open.file(tempZipPath)
            .then(async (directory) => {
              await fsExtra.remove(repoFolderPath);
              await fsExtra.ensureDir(repoFolderPath);
              await directory.extract({ path: repoFolderPath });
              extractedFolders = await fsExtra.readdir(repoFolderPath);
            })
            .catch(error => {
              throw new InternalServerErrorException(`Error al descomprimir el archivo .zip: ${error.message}`);
            });
        } else if (zipFile.mimetype === 'application/x-7z-compressed') {
          // Descomprimir archivo .7z
          await new Promise<void>((resolve, reject) => {
            seven.unpack(tempZipPath, repoFolderPath, (err) => {
              if (err) {
                return reject(new InternalServerErrorException(`Error al descomprimir el archivo .7z: ${err.message}`));
              }
              resolve();
            });
          });
          extractedFolders = await fsExtra.readdir(repoFolderPath);
        } else {
          throw new UnsupportedMediaTypeException('Formato de archivo no soportado');
        }
        // if (extractedFolders.length === 1 && (await fsExtra.stat(join(repoFolderPath, extractedFolders[0]))).isDirectory()) {
        //   const singleFolderPath = join(repoFolderPath, extractedFolders[0]);
        //   const filesInside = await fsExtra.readdir(singleFolderPath);
        //   for (const file of filesInside) {
        //       await fsExtra.move(join(singleFolderPath, file), join(repoFolderPath, file), { overwrite: true });
        //   }
        //   await fsExtra.remove(singleFolderPath);
        // }
      } catch (error) {
        throw new InternalServerErrorException(`Error al descomprimir el archivo: ${error.message}`);
      }

      // Crear el registro de código fuente
      const sourcecode = await this.sourcecodeService.create({
        nom_codigo_fuente: this.encryptionService.encrypt(`${iduProject}_${nameApplication}.${ tempExtension[tempExtension.length-1] }`),
        nom_directorio: this.encryptionService.encrypt(repoFolderPath),
      });
      const opciones = createFileDto.opc_arquitectura;
      // Crear el registro de la aplicación
      const application = new Application();
      application.nom_aplicacion = this.encryptionService.encrypt(nameApplication);
      application.idu_proyecto = iduProject;
      application.num_accion = createFileDto.num_accion;
      application.opc_arquitectura = createFileDto.opc_arquitectura || {"1": false, "2": false, "3": false, "4": false};
      application.opc_lenguaje = createFileDto.opc_lenguaje;
      // Array.isArray(aplicacion.opc_arquitectura) && aplicacion.opc_arquitectura.length > 1 ? aplicacion.opc_arquitectura[1]
      application.opc_estatus_doc = opciones['1'] ? 2 : 0;
      application.opc_estatus_doc_code = opciones['2'] ? 2 : 0;
      application.opc_estatus_caso = opciones['3'] ? 2 : 0;
      application.opc_estatus_calificar = opciones['4'] ? 2 : 0;
      application.applicationstatus = estatu;
      application.sourcecode = sourcecode;
      application.idu_usuario = 1;

      await this.applicationRepository.save(application);

      
      // Renombrar el archivo .zip o .7z con el id y nombre de la aplicación
      const newZipFileName = `${application.idu_proyecto}_${nameApplication}.${ tempExtension[tempExtension.length-1] }`;
      const newZipFilePath = join(zipFile.destination, newZipFileName);

      // Verifica si el archivo existe antes de renombrarlo
      const tempZipExists = await fsExtra.pathExists(tempZipPath);
      if (tempZipExists) {
        await fsExtra.rename(tempZipPath, newZipFilePath);
      } else {
        throw new InternalServerErrorException(`El archivo a renombrar no existe: ${tempZipPath}`);
      }

      await fsExtra.remove(tempFolderPath);

      // Procesar el archivo PDF (si existe)
      if (pdfFile) {
        const pdfFileRename = await this.moveAndRenamePdfFile(pdfFile, repoFolderPath, nameApplication, iduProject);

        if (isSanitizacion) {
          dataCheckmarx = await this.checkmarxService.callPython(application.nom_aplicacion, pdfFileRename, application);

          if (dataCheckmarx.isValid) {
            const scan = new Scan();
            scan.nom_escaneo = this.encryptionService.encrypt(pdfFileRename);
            scan.nom_directorio = this.encryptionService.encrypt(join(repoFolderPath, pdfFileRename));
            scan.application = application;
            await this.scanRepository.save(scan);

            rviaProcess = await this.rviaService.ApplicationInitProcess(application, obj);

          } else {
            await fsExtra.remove(join(repoFolderPath, pdfFileRename));
          }
        }

        if (createFileDto.num_accion != 2) {
          const scan = new Scan();
          scan.nom_escaneo = this.encryptionService.encrypt(pdfFileRename);
          scan.nom_directorio = this.encryptionService.encrypt(join(repoFolderPath, pdfFileRename));
          scan.application = application;
          await this.scanRepository.save(scan);
        }
      }

      if( createFileDto.num_accion != 2 ){
        rviaProcess = await this.rviaService.ApplicationInitProcess(application, obj);
      }

      application.nom_aplicacion = this.encryptionService.decrypt(application.nom_aplicacion);

      return {
        application,
        checkmarx: isSanitizacion && pdfFile ? dataCheckmarx.checkmarx : [],
        esSanitizacion: isSanitizacion,
        rviaProcess
      };

    } catch (error) {
      console.error('Error al procesar el archivo:', error);
      if (pdfFile) {
        await fsExtra.remove(pdfFile.path);
      }

      if (zipFile && zipFile.path) {
        await fsExtra.remove(tempZipPath);
        await fsExtra.remove(tempFolderPath);
      }
      this.handleDBExceptions(error);
      throw error;
    }
  }
  async update(id: number, estatusId: number) {
    try {
      const application = await this.applicationRepository.findOne({
        where: { idu_aplicacion: id },
        relations: ['applicationstatus', 'user'],
      });
      if (!application) throw new NotFoundException(`Aplicación con ID ${id} no encontrado`);

      const estatu = await this.estatusService.findOne(estatusId);
      if (!estatu) throw new NotFoundException(`Estatus con ID ${estatusId} no encontrado`);

      application.applicationstatus = estatu;
      await this.applicationRepository.save(application);

      application.nom_aplicacion = this.encryptionService.decrypt(application.nom_aplicacion);
      return application;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }
  async findAllWithNumAccionTwo(userId: number) {
    try {
      const queryBuilder = this.applicationRepository.createQueryBuilder('application')
        .leftJoinAndSelect('application.checkmarx', 'checkmarx')
        .leftJoinAndSelect('application.applicationstatus', 'applicationstatus')
        .leftJoinAndSelect('application.sourcecode', 'sourcecode')
        .where('application.idu_usuario = :userId', { userId })
        .andWhere('application.num_accion = :numAccion', { numAccion: 2 })  
        .orderBy('application.fec_creacion', 'ASC');
  
      const aplicaciones = await queryBuilder.getMany();
  
      aplicaciones.forEach((aplicacion, index) => {
        aplicacion.nom_aplicacion = this.encryptionService.decrypt(aplicacion.nom_aplicacion);
        
        if (aplicacion.applicationstatus) {
          aplicacion.applicationstatus.des_estatus_aplicacion = this.encryptionService.decrypt(aplicacion.applicationstatus.des_estatus_aplicacion);
        }
  
        if (aplicacion.sourcecode) {
          aplicacion.sourcecode.nom_codigo_fuente = this.encryptionService.decrypt(aplicacion.sourcecode.nom_codigo_fuente);
          aplicacion.sourcecode.nom_directorio = this.encryptionService.decrypt(aplicacion.sourcecode.nom_directorio);
        }
  
        (aplicacion as any).sequentialId = index + 1;
  
        if (aplicacion.checkmarx && aplicacion.checkmarx.length > 0) {
          aplicacion.checkmarx.forEach(checkmarx => {
            checkmarx.nom_checkmarx = this.encryptionService.decrypt(checkmarx.nom_checkmarx);
          });
        }
      });
  
      return aplicaciones;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }
  

  async getStaticFile7z(id: number, response): Promise<void> {
    const application = await this.applicationRepository.findOne({
      where: { idu_aplicacion: id },
      relations: ['applicationstatus', 'scans'],
    });

    if (!application) throw new NotFoundException(`Aplicación con ID ${id} no encontrada`);

    const decryptedAppName = this.encryptionService.decrypt(application.nom_aplicacion);
    const filePath = join(this.downloadPath, `${application.idu_proyecto}_${decryptedAppName}.7z`);

    if (!existsSync(filePath)) throw new BadRequestException(`No se encontró el archivo ${application.idu_proyecto}_${decryptedAppName}.7z`);

    response.setHeader('Content-Type', 'application/x-7z-compressed');
    response.setHeader('Content-Disposition', `attachment; filename="${application.idu_proyecto}_${decryptedAppName}.7z"; filename*=UTF-8''${encodeURIComponent(application.idu_proyecto + '_' + decryptedAppName)}.7z`);

    const readStream = createReadStream(filePath);
    readStream.pipe(response);

    readStream.on('error', (err) => {
      throw new BadRequestException(`Error al leer el archivo: ${err.message}`);
    });
  }

  private parseGitHubURL(url: string): { repoName: string, userName: string } | null {
    const regex = /github\.com\/([^\/]+)\/([^\/]+)\.git$/;
    const match = url.match(regex);
    if (match) {
      return { userName: match[1], repoName: match[2] };
    }
    return null;
  }

  private getRepoInfo(url: string): { userName: string, groupName: string, repoName: string } | null {
    try {
      const { pathname } = new URL(url);

      const pathSegments = pathname.split('/').filter(segment => segment);

      if (pathSegments.length > 0 && pathSegments[pathSegments.length - 1].endsWith('.git')) {
        const repoName = pathSegments.pop()!.replace('.git', '');
        const groupName = pathSegments.pop()!;
        const userName = pathSegments.join('/');

        return {
          userName,
          groupName,
          repoName
        };
      }
    } catch (error) {
      console.error('Error parsing URL:', error);
    }

    return null;
  }
  private async moveAndRenamePdfFile(pdfFile: Express.Multer.File, repoFolderPath: string, project: string, idu_project: string): Promise<string> {
    const newPdfFileName = `checkmarx_${idu_project}_${project}.pdf`;
    const newPdfFilePath = join(repoFolderPath, newPdfFileName);

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

  private handleDBExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    if (error.response) throw new BadRequestException(error.message);
    console.log(error)
    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error, check server logs');
  }
}
