import { Transform } from "class-transformer";
import { IsIn, IsNumber, IsOptional } from "class-validator";

export class CreateFileDto {

    @IsNumber()
    @Transform(({ value }) => parseInt(value, 10))
    @IsIn([2], {
        message: 'El valor de num_accion debe ser 2',
    })
    num_accion: number;

    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    opc_lenguaje: number = 0;
    
    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    idu_usuario: number;

    @IsOptional()
    fec_creacion?: Date;
  
    @IsOptional()
    fec_actualizacion?: Date; 
}
