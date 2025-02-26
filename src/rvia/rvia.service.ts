import { BadRequestException, forwardRef, Inject, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateRviaDto } from './dto/create-rvia.dto';
import { UpdateRviaDto } from './dto/update-rvia.dto';
import { ApplicationsService } from 'src/applications/applications.service';
import { CommonService } from 'src/common/common.service';
import { ErrorRVIA } from './helpers/errors-rvia';
import { CheckmarxService } from 'src/checkmarx/checkmarx.service';
import { ApplicationstatusService } from 'src/applicationstatus/applicationstatus.service';
import { ConfigService } from '@nestjs/config';
import { Application } from 'src/applications/entities/application.entity';

const addon = require(process.env.RVIA_PATH);

@Injectable()
export class RviaService {

  private readonly logger = new Logger("RVIA");
  private readonly crviaEnvironment: number;

  constructor(
    @Inject(forwardRef(() => ApplicationsService))
    private readonly applicationService: ApplicationsService,
    private readonly encryptionService: CommonService,
    @Inject(forwardRef(() => CheckmarxService))
    private readonly checkmarxService: CheckmarxService,
    private readonly configService: ConfigService
  ) {
    this.crviaEnvironment = Number(this.configService.get('RVIA_ENVIRONMENT'));
  }

  async create(createRviaDto: CreateRviaDto) {

    const { idu_aplicacion, conIA, opc_arquitectura } = createRviaDto;

    const obj = new addon.CRvia(this.crviaEnvironment);
    const aplicacion = await this.applicationService.findOne(idu_aplicacion);
    const fileCheckmarx = await this.checkmarxService.findOneByApplication(aplicacion.idu_aplicacion);
    let message;
    let isProccessValid = false;

    // Base de datos: 1 = Producción 2 = Desarrollo
    // const obj = new addon.CRvia(2);
    const lID = aplicacion.idu_proyecto;
    //  -------------------------------- Parámetros de Entrada --------------------------------
    const lIdProject = aplicacion.idu_aplicacion;
    const lEmployee = 90000010;
    const ruta_proyecto = this.encryptionService.decrypt(aplicacion.sourcecode.nom_directorio);
    const tipo_proyecto = aplicacion.num_accion;
    const iConIA = conIA;
    // const Bd = 1 = Producion 2 = Desarrollo
  
    const bConDoc   = Array.isArray(aplicacion.opc_arquitectura) && aplicacion.opc_arquitectura.length > 1 ? aplicacion.opc_arquitectura[1] : false;
    const bConCod   = Array.isArray(aplicacion.opc_arquitectura) && aplicacion.opc_arquitectura.length > 2 ? aplicacion.opc_arquitectura[2] : false;
    const bConTest  = Array.isArray(aplicacion.opc_arquitectura) && aplicacion.opc_arquitectura.length > 3 ? aplicacion.opc_arquitectura[3] : false;
    const bCalifica = Array.isArray(aplicacion.opc_arquitectura) && aplicacion.opc_arquitectura.length > 4 ? aplicacion.opc_arquitectura[4] : false;
    

    if (Array.isArray(fileCheckmarx) && fileCheckmarx.length === 0 && aplicacion.num_accion == 2) {

      throw new BadRequestException("Es necesario subir un archivo CSV.");

    } else if (fileCheckmarx && typeof fileCheckmarx === 'object') {

      // const initProcessResult = obj.initProcess( lID, lEmployee, ruta_proyecto, tipo_proyecto, iConIA, bConDoc, bConCod, bConTest, bCalifica);

      const actionsMap = {
        1: () => obj.createOverviewDoc(lEmployee, ruta_proyecto),
        2: () => obj.createCodeDoc(lEmployee, ruta_proyecto),
        3: () => obj.createTestCases(lEmployee, ruta_proyecto),
        4: () => obj.createRateProject(lEmployee, ruta_proyecto),
      };

      const initProcessResult = actionsMap[opc_arquitectura]();



      if(initProcessResult == 1){
        isProccessValid = true;
        message = "Proceso IA iniciado correctamente";
      }else{
        // throw new BadRequestException( ErrorRVIA[initProcessResult] );
        message = ErrorRVIA[initProcessResult];
      }

    } else {
      throw new InternalServerErrorException('Unexpected error, check server logs');
    }

    aplicacion.nom_aplicacion = this.encryptionService.decrypt(aplicacion.nom_aplicacion);

    const responseConvert = { ...aplicacion, ...{ isProccessValid,  message} };

    return responseConvert;
  }

  async ApplicationInitProcess(aplicacion:Application, obj: any){
    // Base de datos: 1 = Producción 2 = Desarrollo
    // const obj = new addon.CRvia(2);
    var isValidProcess = true;
    var messageRVIA;
    //  -------------------------------- Parámetros de Entrada --------------------------------
    const lID = aplicacion.idu_proyecto;
    const lEmployee = 90000010;
    const ruta_proyecto = this.encryptionService.decrypt(aplicacion.sourcecode.nom_directorio);
    const tipo_proyecto = aplicacion.num_accion;
    const iConIA = 1;
    // const Bd = 1 = Producion 2 = Desarrollo
  
    const bConDoc   = Array.isArray(aplicacion.opc_arquitectura) && aplicacion.opc_arquitectura.length > 1 ? aplicacion.opc_arquitectura[1] : false;
    const bConCod   = Array.isArray(aplicacion.opc_arquitectura) && aplicacion.opc_arquitectura.length > 2 ? aplicacion.opc_arquitectura[2] : false;
    const bConTest  = Array.isArray(aplicacion.opc_arquitectura) && aplicacion.opc_arquitectura.length > 3 ? aplicacion.opc_arquitectura[3] : false;
    const bCalifica = Array.isArray(aplicacion.opc_arquitectura) && aplicacion.opc_arquitectura.length > 4 ? aplicacion.opc_arquitectura[4] : false;

    const initProcessResult = await obj.initProcess( lID, lEmployee, ruta_proyecto, tipo_proyecto, iConIA, bConDoc, bConCod, bConTest, bCalifica);

    const resultType = typeof initProcessResult;

    if (resultType === 'number') {
      this.logger.debug('Mensaje del RVIA (int):', initProcessResult);
    } else if (resultType === 'string') {
      this.logger.debug('Mensaje del RVIA (string):', initProcessResult);
    } else {
      this.logger.debug('Mensaje del RVIA (otro tipo):', initProcessResult);
    }

    if( initProcessResult == 1){
      messageRVIA = "Proceso IA Iniciado Correctamente";
    }else{
      isValidProcess = false;
      messageRVIA = ErrorRVIA[initProcessResult];
    }

    return { isValidProcess, messageRVIA };
  }

  async getVersion() {

    const obj = new addon.CRvia(this.crviaEnvironment);

    return await obj.getVersionAddons();

  }

  findAll() {
    return `This action returns all rvia`;
  }

  findOne(id: number) {
    return `This action returns a #${id} rvia`;
  }

  update(id: number, updateRviaDto: UpdateRviaDto) {
    return `This action updates a #${id} rvia`;
  }

  remove(id: number) {
    return `This action removes a #${id} rvia`;
  }
}
