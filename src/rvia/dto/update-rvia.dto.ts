import { PartialType } from '@nestjs/mapped-types';
import { CreateRviaDto } from './create-rvia.dto';

export class UpdateRviaDto extends PartialType(CreateRviaDto) {}
