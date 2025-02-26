import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateApplicationstatusDto {

    @IsString()
    @MinLength(1)
    des_estatus_aplicacion: string;

    @IsOptional()
    fec_creacion?: Date;
  
    @IsOptional()
    fec_actualizacion?: Date; 
}
