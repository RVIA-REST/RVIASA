import { PartialType } from '@nestjs/mapped-types';
import { CreateApplicationstatusDto } from './create-applicationstatus.dto';

export class UpdateApplicationstatusDto extends PartialType(CreateApplicationstatusDto) {}
