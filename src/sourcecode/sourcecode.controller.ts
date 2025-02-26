import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';

import { SourcecodeService } from './sourcecode.service';
import { CreateSourcecodeDto } from './dto/create-sourcecode.dto';

// @ApiTags('Código Fuente')
@Controller('sourcecode')
export class SourcecodeController {
  constructor(private readonly sourcecodeService: SourcecodeService) {}

  // @Post()
  // create(@Body() createSourcecodeDto: CreateSourcecodeDto) {
  //   return this.sourcecodeService.create(createSourcecodeDto);
  // }

  // @Get()
  // findAll() {
  //   return this.sourcecodeService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id', ParseIntPipe) id: number) {
  //   return this.sourcecodeService.findOne(id);
  // }
}
