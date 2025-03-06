import { Injectable, NestMiddleware, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class UserValidationMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const { idu_usuario } = req.body;

    // Validar que se envió el id_usuario
    if (!idu_usuario) {
      throw new BadRequestException('El idu_usuario es obligatorio');
    }

    // Buscar usuario en la base de datos
    const user = await this.authService.validateUser(idu_usuario);

    // Si no existe, lanzar error de autenticación
    if (!user) {
      throw new UnauthorizedException('Usuario no válido');
    }

    // Adjuntar usuario a la solicitud para uso en el controlador
    req['user'] = user;
    next();
  }
}