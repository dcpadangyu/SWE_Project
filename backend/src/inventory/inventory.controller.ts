import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { UpdateIngredientStockDto } from './dto/update-ingredient-stock.dto';
import { CreateProductWithRecipesDto } from './dto/create-product-with-recipes.dto';
import { UpdateProductRecipesDto } from './dto/update-product-recipes.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Inventory (Quản lý nguyên liệu & công thức & sản phẩm)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.BARISTA, Role.ADMIN)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('ingredients')
  @Roles(Role.BARISTA, Role.ADMIN)
  @ApiOperation({
    summary: 'Lấy danh sách toàn bộ nguyên liệu kèm trạng thái cảnh báo tồn kho (Dành cho Staff)',
  })
  @ApiOkResponse({
    description: 'Danh sách nguyên liệu và số lượng tồn kho.',
  })
  @ApiForbiddenResponse({
    description: 'Chỉ nhân viên (BARISTA/ADMIN) mới có quyền truy cập.',
  })
  async getAllIngredients() {
    return this.inventoryService.getAllIngredients();
  }

  @Post('ingredients')
  @Roles(Role.BARISTA, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Thêm mới nguyên liệu vào kho (Ghi nhận log CREATE màu xanh)',
  })
  @ApiForbiddenResponse({
    description: 'Chỉ nhân viên (BARISTA/ADMIN) mới có quyền thực hiện.',
  })
  async createIngredient(
    @Body() dto: CreateIngredientDto,
    @CurrentUser() user: any,
  ) {
    const performedBy = user?.fullName || user?.email || 'Nhân viên Pha chế';
    return this.inventoryService.createIngredient(dto, performedBy);
  }

  @Patch('ingredients/:id')
  @Roles(Role.BARISTA, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chỉnh sửa thông tin nguyên liệu (Ghi nhận log UPDATE màu vàng)',
  })
  @ApiForbiddenResponse({
    description: 'Chỉ nhân viên (BARISTA/ADMIN) mới có quyền thực hiện.',
  })
  async updateIngredient(
    @Param('id') id: string,
    @Body() dto: UpdateIngredientDto,
    @CurrentUser() user: any,
  ) {
    const performedBy = user?.fullName || user?.email || 'Nhân viên Pha chế';
    return this.inventoryService.updateIngredient(id, dto, performedBy);
  }

  @Delete('ingredients/:id')
  @Roles(Role.BARISTA, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa nguyên liệu khỏi kho (Ghi nhận log DELETE màu đỏ)',
  })
  @ApiForbiddenResponse({
    description: 'Chỉ nhân viên (BARISTA/ADMIN) mới có quyền thực hiện.',
  })
  async deleteIngredient(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const performedBy = user?.fullName || user?.email || 'Nhân viên Pha chế';
    return this.inventoryService.deleteIngredient(id, performedBy);
  }

  @Patch('ingredients/:id/stock')
  @Roles(Role.BARISTA, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cập nhật / Nhập thêm tồn kho nguyên liệu (Dành cho Staff)',
  })
  @ApiForbiddenResponse({
    description: 'Chỉ nhân viên (BARISTA/ADMIN) mới có quyền thực hiện.',
  })
  async updateStock(
    @Param('id') id: string,
    @Body() dto: UpdateIngredientStockDto,
    @CurrentUser() user: any,
  ) {
    const performedBy = user?.fullName || user?.email || 'Nhân viên Pha chế';
    return this.inventoryService.updateIngredientStock(
      id,
      dto.quantity,
      dto.action || 'ADD',
      performedBy,
    );
  }

  @Get('ingredients/logs')
  @Roles(Role.BARISTA, Role.ADMIN)
  @ApiOperation({
    summary: 'Lấy danh sách lịch sử thay đổi nguyên liệu (Audit Log đồng bộ mọi Staff)',
  })
  @ApiForbiddenResponse({
    description: 'Chỉ nhân viên (BARISTA/ADMIN) mới có quyền truy cập.',
  })
  async getAuditLogs(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    return this.inventoryService.getAuditLogs(parsedLimit);
  }

  @Get('recipes')
  @Roles(Role.BARISTA, Role.ADMIN)
  @ApiOperation({
    summary: 'Lấy bảng công thức định lượng của các đồ uống theo Size S, M, L',
  })
  @ApiForbiddenResponse({
    description: 'Chỉ nhân viên (BARISTA/ADMIN) mới có quyền truy cập.',
  })
  async getAllRecipes() {
    return this.inventoryService.getAllRecipes();
  }

  @Post('products')
  @Roles(Role.BARISTA, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Thêm sản phẩm mới kèm công thức định lượng ban đầu (Dành cho Staff)',
  })
  @ApiForbiddenResponse({
    description: 'Chỉ nhân viên (BARISTA/ADMIN) mới có quyền thực hiện.',
  })
  async createProduct(@Body() dto: CreateProductWithRecipesDto) {
    return this.inventoryService.createProductWithRecipes(dto);
  }

  @Put('products/:id/recipes')
  @Roles(Role.BARISTA, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chỉnh sửa toàn bộ công thức định lượng của một sản phẩm (Dành cho Staff)',
  })
  @ApiForbiddenResponse({
    description: 'Chỉ nhân viên (BARISTA/ADMIN) mới có quyền thực hiện.',
  })
  async updateProductRecipes(
    @Param('id') productId: string,
    @Body() dto: UpdateProductRecipesDto,
  ) {
    return this.inventoryService.updateProductRecipes(productId, dto);
  }

  @Post('recalculate-stock')
  @Roles(Role.BARISTA, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ép tính toán lại toàn bộ tồn kho sản phẩm từ nguyên liệu hiện có',
  })
  @ApiForbiddenResponse({
    description: 'Chỉ nhân viên (BARISTA/ADMIN) mới có quyền thực hiện.',
  })
  async recalculateStock() {
    await this.inventoryService.recalculateAllProductsStock();
    return {
      success: true,
      message: 'Đã tính toán lại tồn kho toàn bộ sản phẩm thành công.',
    };
  }
}
