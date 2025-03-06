import { IsOptional, IsString, MinLength } from "class-validator";

export class CreatePositionDto {

    @IsString()
    @MinLength(1)
    nom_rol: string;

    @IsOptional()
    fec_creacion?: Date;
  
    @IsOptional()
    fec_actualizacion?: Date; 
}
