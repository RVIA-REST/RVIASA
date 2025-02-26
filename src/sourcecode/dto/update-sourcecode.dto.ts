import { PartialType } from '@nestjs/mapped-types';
import { CreateSourcecodeDto } from './create-sourcecode.dto';

export class UpdateSourcecodeDto extends PartialType(CreateSourcecodeDto) {}
