import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    const isHttpException = exception instanceof HttpException;
    const httpStatus = isHttpException
      ? (exception as HttpException).getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttpException
      ? (exception as HttpException).getResponse()
      : (exception as any).message || 'An internal error occurred. Please contact support.';

    let path = 'unknown';
    try {
      path = httpAdapter.getRequestUrl(ctx.getRequest());
    } catch {
      const req = ctx.getRequest();
      path = req.url || req.originalUrl || 'unknown';
    }

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path,
      message: typeof message === 'object' ? (message as any).message || message : message,
    };

    this.logger.error(
      `Exception thrown at ${responseBody.path}: ${responseBody.message}`,
      (exception as any).stack,
    );

    try {
      httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
    } catch (replyError) {
      this.logger.error('Failed to send error response via httpAdapter', replyError.stack);
      // Fallback for extreme cases
      const res = ctx.getResponse();
      if (typeof res.status === 'function') {
        res.status(httpStatus).json(responseBody);
      }
    }
  }
}
