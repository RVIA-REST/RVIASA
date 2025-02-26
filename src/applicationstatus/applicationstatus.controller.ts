import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';

import { ApplicationstatusService } from './applicationstatus.service';
import { CreateApplicationstatusDto } from './dto/create-applicationstatus.dto';
import { UpdateApplicationstatusDto } from './dto/update-applicationstatus.dto';
import { Applicationstatus } from './entities/applicationstatus.entity';



@Controller('applicationstatus')
export class ApplicationstatusController {
  constructor(private readonly applicationstatusService: ApplicationstatusService) {}

  @Post()
  create(@Body() createApplicationstatusDto: CreateApplicationstatusDto) {
    return this.applicationstatusService.create(createApplicationstatusDto);
  }

  @Get()
  findAll() {
    return this.applicationstatusService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.applicationstatusService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateApplicationstatusDto: UpdateApplicationstatusDto) {
    return this.applicationstatusService.update(id, updateApplicationstatusDto);
  }

  // @Delete(':id')
  // @Auth(ValidRoles.admin)
  // @ApiResponse({ status:200, description:'Actualización del Estatus', type: Applicationstatus })
  // @ApiResponse({ status:400, description:'Bad Request', type: BadRequestResponse })
  // @ApiResponse({ status:401, description:'Unauthorized', type: UnauthorizedResponse })
  // @ApiResponse({ status:403, description:'Forbidden', type: ForbiddenResponse })
  // @ApiResponse({ status:500, description:'Internal server error', type: InternalServerErrorResponse })
  // remove(@Param('id') id: string) {
  //   return this.applicationstatusService.remove(+id);
  // }
}
