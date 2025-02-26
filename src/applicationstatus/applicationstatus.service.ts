import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateApplicationstatusDto } from './dto/create-applicationstatus.dto';
import { UpdateApplicationstatusDto } from './dto/update-applicationstatus.dto';
import { Applicationstatus } from './entities/applicationstatus.entity';
import { CommonService } from 'src/common/common.service';



@Injectable()
export class ApplicationstatusService {

  private readonly logger = new Logger('ApplicationstatusService');

  constructor(
    @InjectRepository(Applicationstatus)
    private readonly applicationStatusRepository: Repository<Applicationstatus>,
    private readonly encryptionService: CommonService
  ) { }

  async create(createApplicationstatusDto: CreateApplicationstatusDto) {
    try {

      createApplicationstatusDto.des_estatus_aplicacion = this.encryptionService.encrypt(createApplicationstatusDto.des_estatus_aplicacion);

      const status = this.applicationStatusRepository.create(createApplicationstatusDto);
      await this.applicationStatusRepository.save(status);

      return status;

    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll() {

    try {
      const estatusall = await this.applicationStatusRepository.find();

      const decryptedStatuses = estatusall.map(status => {
        if (status.des_estatus_aplicacion) {
          status.des_estatus_aplicacion = this.encryptionService.decrypt(status.des_estatus_aplicacion);
        }
        return status;
      });

      return decryptedStatuses;
    } catch (error) {
      this.handleDBExceptions(error);
    }

  }

  async findOne(id: number) {
    const status = await this.applicationStatusRepository.findOneBy({ idu_estatus_aplicacion: id });

    if (!status)
      throw new NotFoundException(`Estatus con ${id} no encontrado `);

    status.des_estatus_aplicacion = this.encryptionService.decrypt(status.des_estatus_aplicacion);
    return status;
  }

  async update(id: number, updateApplicationstatusDto: UpdateApplicationstatusDto) {
    const statu = await this.applicationStatusRepository.preload({
      idu_estatus_aplicacion: id,
      ...updateApplicationstatusDto
    });

    if (!statu) throw new NotFoundException(`Rol con ${id} no encontrado `);

    try {

      statu.des_estatus_aplicacion = this.encryptionService.encrypt(updateApplicationstatusDto.des_estatus_aplicacion);
      await this.applicationStatusRepository.save(statu);
      return statu;

    } catch (error) {
      this.handleDBExceptions(error);
    }

  }

  remove(id: number) {
    return `This action removes a #${id} applicationstatus`;
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505')
      throw new BadRequestException(error.detail);

    this.logger.error(error);
    throw new InternalServerErrorException("Unexpected error, check server logs");
  }

}
