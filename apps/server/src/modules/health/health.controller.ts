import { Controller, Get } from '@nestjs/common';
import type { ApiResponse, HealthData } from '@app/shared';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): ApiResponse<HealthData> {
    return {
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
      message: 'success',
    };
  }
}
