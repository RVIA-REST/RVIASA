import { Checkmarx } from '../entities/checkmarx.entity';

class CheckmarxDto {
  nom_checkmarx: string;
  nom_directorio: string;
  application: any; // Define el tipo según tu aplicación
}

export class SuccessResponse {
  message: string;
  isValid: boolean;
  checkmarx: Checkmarx;
}