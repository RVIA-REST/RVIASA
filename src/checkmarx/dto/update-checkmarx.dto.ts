import { PartialType } from '@nestjs/mapped-types';
import { CreateCheckmarxDto } from './create-checkmarx.dto';

export class UpdateCheckmarxDto extends PartialType(CreateCheckmarxDto) {}
