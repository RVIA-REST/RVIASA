

class OpcArquitecturaDto {
  1: boolean;
  2: boolean;
  3: boolean;
  4: boolean;
}

class ApplicationStatusDto {
  idu_estatus_aplicacion: number;
  des_estatus_aplicacion: string;
}

class SourceCodeDto {
  idu_codigo_fuente: number;
  nom_codigo_fuente: string;
  nom_directorio: string;
}

class PositionDto {
  idu_rol: number;
  nom_rol: string;
}

class UserDto {
  idu_usuario: number;
  num_empleado: number;
  nom_correo: string;
  nom_usuario: string;
  opc_es_activo: boolean;
  position: PositionDto;
}

export class CreateResponseDto {
  idu_aplicacion: number;
  idu_proyecto: string;
  nom_aplicacion: string;
  num_accion: number;
  opc_lenguaje: number;
  opc_estatus_doc: number;
  opc_estatus_doc_code: number;
  opc_estatus_caso: number;
  opc_estatus_calificar: number;
  opc_arquitectura: OpcArquitecturaDto;
  applicationstatus: ApplicationStatusDto;
  sourcecode: SourceCodeDto;
  user: UserDto;
  isProccessValid: boolean;
  message: string;
}
