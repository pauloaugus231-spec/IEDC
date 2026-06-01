import { Controller, Get, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { Public } from './auth/public.decorator';
import { ObservabilityService } from './modules/observability/observability.service';

@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly observabilityService: ObservabilityService) {}

  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'iedc-backend',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  getLive() {
    return this.getHealth();
  }

  @Get('ready')
  async getReady(@Res({ passthrough: true }) response: Response) {
    const readiness = await this.observabilityService.getReadinessStatus();

    if (readiness.status !== 'ok') {
      response.status(503);
    }

    return readiness;
  }
}
