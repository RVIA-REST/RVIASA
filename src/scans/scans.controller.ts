import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ScansService } from './scans.service';
import { CreateScanDto } from './dto/create-scan.dto';


// @ApiTags('Escaneos')
@Controller('scans')
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  // @Post()
  // create(@Body() createScanDto: CreateScanDto) {
  //   return this.scansService.create(createScanDto);
  // }

  // @Get()
  // findAll() {
  //   return this.scansService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.scansService.findOne(+id);
  // }
  
}
