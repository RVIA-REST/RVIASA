import { Transform } from "class-transformer";
import { IsIn, IsJSON, IsNumber, IsObject, IsOptional, IsString, MinLength } from "class-validator";

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

    @IsOptional()
    @Transform(({ value }) => {
        try {
          return typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
          throw new Error('opc_arquitectura debe ser una cadena JSON válida');
        }
      })
      @IsObject({ message: 'opc_arquitectura debe ser un objeto' })
    opc_arquitectura:Record<string, boolean>;
    
    @IsOptional()
    fec_creacion?: Date;
  
    @IsOptional()
    fec_actualizacion?: Date; 

}
