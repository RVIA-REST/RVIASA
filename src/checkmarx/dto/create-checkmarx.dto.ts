import { Transform } from "class-transformer";
import { IsNumber, IsString, MinLength } from "class-validator";

export class CreateCheckmarxDto {

    @IsNumber()
    @Transform(({ value }) => parseInt(value, 10))
    idu_aplicacion: number;

}
