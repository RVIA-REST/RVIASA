import { Transform } from "class-transformer";
import { IsIn, IsNumber } from "class-validator";

export class CreateRviaDto {

    @IsNumber()
    @Transform(({ value }) => parseInt(value, 10))
    idu_aplicacion: number;

    @IsNumber()
    @Transform(({ value }) => parseInt(value, 10))
    conIA: number;

    @IsNumber()
    @Transform(({ value }) => parseInt(value, 10))
    @IsIn([ 1, 2, 3, 4 ], {
        message: 'El valor de num_accion debe ser 1, 2, 3 o 4',
    })
    opc_arquitectura: number;

}
