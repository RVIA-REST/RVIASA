import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateSourcecodeDto {

    @IsString()
    @MinLength(1)
    nom_codigo_fuente: string;

    @IsString()
    @MinLength(1)
    nom_directorio: string;

    @IsOptional()
    fec_creacion?: Date;
  
    @IsOptional()
    fec_actualizacion?: Date; 

}
