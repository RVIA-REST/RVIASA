import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RviaService } from './rvia.service';
import { CreateRviaDto } from './dto/create-rvia.dto';
;
import { CreateResponseDto } from './dto/create-response.dto';


@Controller('rvia')
export class RviaController {
  constructor(private readonly rviaService: RviaService) {}

  @Post()
 
  create(@Body() createRviaDto: CreateRviaDto) {
    return this.rviaService.create(createRviaDto);
  }

  @Get()
  findAll() {
    return this.rviaService.getVersion();
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.rviaService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateRviaDto: UpdateRviaDto) {
  //   return this.rviaService.update(+id, updateRviaDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.rviaService.remove(+id);
  // }
}
