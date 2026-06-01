import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9._:-]{8,120}$/;

export interface RequestWithId extends Request {
  requestId?: string;
}

export function requestIdMiddleware(request: RequestWithId, response: Response, next: NextFunction) {
  const incoming = request.header('x-request-id');
  const requestId = incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();

  request.requestId = requestId;
  response.setHeader('x-request-id', requestId);
  next();
}
