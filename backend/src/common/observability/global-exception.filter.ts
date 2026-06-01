import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  LoggerService,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthRequest } from '../../auth/auth.types';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<AuthRequest>();
    const status = this.resolveStatus(exception);
    const message = this.resolveMessage(exception);
    const requestId = request.requestId;
    const path = (request.originalUrl || request.url || '').split('?')[0] || '/';

    this.logger.error(
      {
        event: 'http.exception',
        requestId,
        method: request.method,
        path,
        status,
        user: request.user
          ? {
              login: request.user.login,
              role: request.user.role,
            }
          : null,
        message,
        errorName: exception instanceof Error ? exception.name : 'UnknownException',
        stack: exception instanceof Error ? exception.stack : undefined,
      },
      GlobalExceptionFilter.name,
    );

    if (response.headersSent) {
      return;
    }

    response.status(status).json({
      statusCode: status,
      message,
      requestId,
      timestamp: new Date().toISOString(),
      path,
    });
  }

  private resolveStatus(exception: unknown) {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveMessage(exception: unknown) {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return response;
      }

      if (response && typeof response === 'object') {
        const message = (response as { message?: unknown }).message;

        if (Array.isArray(message)) {
          return message.join('; ');
        }

        if (typeof message === 'string') {
          return message;
        }
      }

      return exception.message;
    }

    return process.env.NODE_ENV === 'production'
      ? 'Erro interno no servidor.'
      : exception instanceof Error
        ? exception.message
        : 'Erro interno no servidor.';
  }
}
