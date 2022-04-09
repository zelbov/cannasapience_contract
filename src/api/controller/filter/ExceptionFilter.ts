

import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception.getStatus();

        let responseObject = exception.getResponse()

        if(status == HttpStatus.NOT_FOUND && !request.path.match(/\.json$/) && typeof(responseObject) != 'object')
            return response.status(HttpStatus.PERMANENT_REDIRECT)
                .redirect('/404');

        return response.status(status)
            .json(responseObject)

    }
}