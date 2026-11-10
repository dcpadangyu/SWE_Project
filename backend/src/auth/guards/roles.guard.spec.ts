import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockExecutionContext(user?: { role?: Role }): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('nên cho phép truy cập nếu route không yêu cầu role metadata', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockExecutionContext({ role: Role.CUSTOMER });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('nên cho phép truy cập khi user có role BARISTA nằm trong danh sách yêu cầu', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.BARISTA, Role.ADMIN]);
    const context = createMockExecutionContext({ role: Role.BARISTA });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('nên cho phép truy cập khi user có role ADMIN nằm trong danh sách yêu cầu', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.BARISTA, Role.ADMIN]);
    const context = createMockExecutionContext({ role: Role.ADMIN });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('nên ném ForbiddenException khi user có role CUSTOMER không nằm trong danh sách yêu cầu', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.BARISTA, Role.ADMIN]);
    const context = createMockExecutionContext({ role: Role.CUSTOMER });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('nên ném ForbiddenException khi không có thông tin user hoặc user không có role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.BARISTA, Role.ADMIN]);
    const contextNoUser = createMockExecutionContext(undefined);
    const contextNoRole = createMockExecutionContext({});

    expect(() => guard.canActivate(contextNoUser)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(contextNoRole)).toThrow(ForbiddenException);
  });
});
