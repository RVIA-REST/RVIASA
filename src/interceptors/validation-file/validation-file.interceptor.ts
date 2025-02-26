// src/interceptors/validation.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as fs from 'fs';

@Injectable()
export class ValidationInterceptor implements NestInterceptor {
  constructor(private readonly validateDto: (dto: any) => boolean) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const files = request.files || [];
    const file = request.file;
    const body = request.body;

    // Validate DTO
    if (!this.validateDto(body)) {
      this.cleanupFiles([file, ...files]); // Handle both single and multiple files
      throw new BadRequestException('Invalid DTO');
    }

    return next.handle().pipe(
      catchError((error) => {
        this.cleanupFiles([file, ...files]); // Handle both single and multiple files
        throw new InternalServerErrorException(error.response ? error.response : error.message);
      })
    );
  }

  private async cleanupFiles(files: Array<Express.Multer.File | undefined>) {
    const deletionPromises = files
      .filter(file => file?.path) // Filter out undefined or files without a path
      .map(file => fs.promises.unlink(file!.path)); // Delete file

    try {
      await Promise.all(deletionPromises); // Wait for all deletions to complete
    } catch (error) {
      console.error('Error cleaning up files:', error);
    }
  }

}
