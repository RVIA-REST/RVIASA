import { IsString, MinLength } from "class-validator";

export class CreateScanDto {

    @IsString()
    @MinLength(1)
    nom_escaneo: string;

    @IsString()
    @MinLength(1)
    nom_directorio: string;


}
