import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { InventoryController } from './inventory.controller';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

describe('InventoryController RBAC Roles', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  it('DELETE /inventory/ingredients/:id phải yêu cầu role BARISTA hoặc ADMIN', () => {
    const roles = reflector.get<Role[]>(
      ROLES_KEY,
      InventoryController.prototype.deleteIngredient,
    );
    expect(roles).toBeDefined();
    expect(roles).toContain(Role.BARISTA);
    expect(roles).toContain(Role.ADMIN);
    expect(roles).not.toContain(Role.CUSTOMER);
  });

  it('POST /inventory/ingredients phải yêu cầu role BARISTA hoặc ADMIN', () => {
    const roles = reflector.get<Role[]>(
      ROLES_KEY,
      InventoryController.prototype.createIngredient,
    );
    expect(roles).toBeDefined();
    expect(roles).toContain(Role.BARISTA);
    expect(roles).toContain(Role.ADMIN);
  });

  it('PATCH /inventory/ingredients/:id/stock phải yêu cầu role BARISTA hoặc ADMIN', () => {
    const roles = reflector.get<Role[]>(
      ROLES_KEY,
      InventoryController.prototype.updateStock,
    );
    expect(roles).toBeDefined();
    expect(roles).toContain(Role.BARISTA);
    expect(roles).toContain(Role.ADMIN);
  });

  it('POST /inventory/products phải yêu cầu role BARISTA hoặc ADMIN', () => {
    const roles = reflector.get<Role[]>(
      ROLES_KEY,
      InventoryController.prototype.createProduct,
    );
    expect(roles).toBeDefined();
    expect(roles).toContain(Role.BARISTA);
    expect(roles).toContain(Role.ADMIN);
  });

  it('PUT /inventory/products/:id/recipes phải yêu cầu role BARISTA hoặc ADMIN', () => {
    const roles = reflector.get<Role[]>(
      ROLES_KEY,
      InventoryController.prototype.updateProductRecipes,
    );
    expect(roles).toBeDefined();
    expect(roles).toContain(Role.BARISTA);
    expect(roles).toContain(Role.ADMIN);
  });
});
