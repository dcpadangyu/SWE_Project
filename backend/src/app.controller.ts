import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Kiểm tra kết nối gốc của máy chủ API' })
  @ApiOkResponse({ description: 'Máy chủ phản hồi chuỗi chào mừng thành công.' })
  getHello(): string {
    return this.appService.getHello();
  }
}
