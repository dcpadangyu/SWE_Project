import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';

@ApiTags('Products')
@ApiServiceUnavailableResponse({ description: 'Database tạm thời không khả dụng.' })
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách đồ uống' })
  @ApiOkResponse({ description: 'Danh sách sản phẩm; mảng rỗng nếu chưa có dữ liệu.' })
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết đồ uống' })
  @ApiParam({
    name: 'id',
    description: 'UUID sản phẩm. Có thể sao chép ID từ GET /products.',
    format: 'uuid',
    example: '20000000-0000-4000-8000-000000000001',
  })
  @ApiOkResponse({ description: 'Chi tiết sản phẩm, giá theo size và topping.' })
  @ApiBadRequestResponse({ description: 'ID không đúng định dạng UUID.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm.' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.productsService.findOne(id);
  }
}
