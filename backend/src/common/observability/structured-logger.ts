import { LoggerService } from '@nestjs/common';

type StructuredLevel = 'error' | 'warn' | 'log' | 'debug' | 'verbose';

const LEVEL_WEIGHT: Record<StructuredLevel, number> = {
  error: 0,
  warn: 1,
  log: 2,
  debug: 3,
  verbose: 4,
};

const SECRET_KEY_PATTERN = /(password|senha|token|secret|authorization|cookie|api[_-]?key)/i;
const MAX_STRING_LENGTH = 1_000;
const MAX_OBJECT_KEYS = 40;
const MAX_DEPTH = 5;

export class StructuredLogger implements LoggerService {
  private readonly service = process.env.SERVICE_NAME || 'iedc-backend';
  private readonly appVersion = process.env.APP_VERSION || 'local';
  private readonly jsonOutput = process.env.LOG_FORMAT === 'json' || process.env.NODE_ENV === 'production';
  private readonly minLevel = this.resolveLevel(process.env.LOG_LEVEL);

  log(message: unknown, ...optionalParams: unknown[]) {
    this.write('log', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]) {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]) {
    this.write('verbose', message, optionalParams);
  }

  private write(level: StructuredLevel, message: unknown, optionalParams: unknown[]) {
    if (LEVEL_WEIGHT[level] > LEVEL_WEIGHT[this.minLevel]) {
      return;
    }

    const { context, trace, metadata } = this.extractOptionalParams(optionalParams);
    const payload = this.buildPayload(level, message, context, trace, metadata);

    if (this.jsonOutput) {
      this.writeLine(level, JSON.stringify(payload));
      return;
    }

    const contextLabel = payload.context ? ` [${payload.context}]` : '';
    const messageText = typeof payload.message === 'string' ? payload.message : JSON.stringify(payload.message);
    const detail = payload.metadata ? ` ${JSON.stringify(payload.metadata)}` : '';
    this.writeLine(level, `${payload.timestamp} ${level.toUpperCase()}${contextLabel} ${messageText}${detail}`);
  }

  private buildPayload(
    level: StructuredLevel,
    message: unknown,
    context?: string,
    trace?: string,
    metadata?: unknown[],
  ) {
    const base = {
      timestamp: new Date().toISOString(),
      level: level === 'log' ? 'info' : level,
      service: this.service,
      version: this.appVersion,
      context,
    };

    if (message instanceof Error) {
      return {
        ...base,
        message: message.message,
        errorName: message.name,
        stack: this.shouldIncludeStack() ? this.truncate(message.stack) : undefined,
        metadata: this.sanitize(metadata),
      };
    }

    if (message && typeof message === 'object') {
      const record = message as Record<string, unknown>;
      return {
        ...base,
        message: this.resolveMessage(record),
        metadata: this.sanitize({
          ...record,
          trace: this.shouldIncludeStack() ? trace : undefined,
          optionalParams: metadata?.length ? metadata : undefined,
        }),
      };
    }

    return {
      ...base,
      message: String(message),
      stack: this.shouldIncludeStack() ? trace : undefined,
      metadata: this.sanitize(metadata?.length ? metadata : undefined),
    };
  }

  private extractOptionalParams(optionalParams: unknown[]) {
    const params = [...optionalParams];
    let context: string | undefined;
    let trace: string | undefined;

    if (typeof params.at(-1) === 'string') {
      context = String(params.pop());
    }

    if (typeof params[0] === 'string' && params[0].includes('\n')) {
      trace = String(params.shift());
    }

    return { context, trace, metadata: params };
  }

  private resolveMessage(record: Record<string, unknown>) {
    const event = record.event || record.message || record.msg;
    if (typeof event === 'string' && event.trim()) {
      return event;
    }

    return 'evento_estruturado';
  }

  private sanitize(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
    if (value === undefined) {
      return undefined;
    }

    if (value === null || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return this.truncate(value);
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: this.truncate(value.message),
        stack: this.shouldIncludeStack() ? this.truncate(value.stack) : undefined,
      };
    }

    if (typeof value !== 'object') {
      return String(value);
    }

    if (seen.has(value)) {
      return '[Circular]';
    }

    if (depth >= MAX_DEPTH) {
      return '[MaxDepth]';
    }

    seen.add(value);

    if (Array.isArray(value)) {
      return value.slice(0, MAX_OBJECT_KEYS).map((item) => this.sanitize(item, depth + 1, seen));
    }

    const entries = Object.entries(value as Record<string, unknown>).slice(0, MAX_OBJECT_KEYS);
    return Object.fromEntries(
      entries.map(([key, item]) => [
        key,
        SECRET_KEY_PATTERN.test(key) ? '[REDACTED]' : this.sanitize(item, depth + 1, seen),
      ]),
    );
  }

  private truncate(value: string | undefined) {
    if (!value) {
      return value;
    }

    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value;
  }

  private resolveLevel(value: string | undefined): StructuredLevel {
    if (value && value in LEVEL_WEIGHT) {
      return value as StructuredLevel;
    }

    return process.env.NODE_ENV === 'production' ? 'log' : 'debug';
  }

  private shouldIncludeStack() {
    return process.env.NODE_ENV !== 'production' || process.env.LOG_INCLUDE_STACK === 'true';
  }

  private writeLine(level: StructuredLevel, line: string) {
    if (level === 'error') {
      process.stderr.write(`${line}\n`);
      return;
    }

    process.stdout.write(`${line}\n`);
  }
}

export function createStructuredLogger() {
  return new StructuredLogger();
}
