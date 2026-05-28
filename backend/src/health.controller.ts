import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/public.decorator';

@Public()
@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'iedc-backend',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
