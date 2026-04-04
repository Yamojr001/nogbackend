import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest();
      const user = request.user;

      if (!user) {
        throw new ForbiddenException('User not authenticated');
      }

    // Super Admin, Finance Admin, and Auditor have global access
    if ([UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.AUDITOR].includes(user.role)) {
      return true;
    }

    const params = request.params;
    const { userId, role, branchId, groupId } = user;

    // 1. Check User ID Ownership (e.g., /users/:id/...)
    if (params.id) {
      const targetId = parseInt(params.id, 10);
      if (role === UserRole.MEMBER && targetId !== userId) {
        throw new ForbiddenException('You can only access your own profile/settings');
      }
    }

    // 2. Check Branch ID Ownership (e.g., /sub-org/:branchId/...)
    if (params.branchId) {
      const targetBranchId = parseInt(params.branchId, 10);
      if ([UserRole.SUB_ORG_ADMIN, UserRole.SUB_ORG_OFFICER].includes(role) && targetBranchId !== branchId) {
        throw new ForbiddenException('You can only access your assigned branch');
      }
      if (role === UserRole.MEMBER && targetBranchId !== branchId) {
        throw new ForbiddenException('You do not belong to this branch');
      }
    }

    // 3. Check Group ID Ownership (e.g., /group/:id/...)
    // Note: Some routes use :id for groupId
    const targetGroupId = params.groupId ? parseInt(params.groupId, 10) : (params.id ? parseInt(params.id, 10) : null);
    
    // Determine if the current route is a Group route
    const isGroupRoute = request.url.includes('/group/');
    
    if (isGroupRoute && targetGroupId) {
      if ([UserRole.GROUP_ADMIN, UserRole.GROUP_TREASURER, UserRole.GROUP_SECRETARY].includes(role) && targetGroupId !== groupId) {
        throw new ForbiddenException('You can only access your assigned group');
      }
      if (role === UserRole.MEMBER && targetGroupId !== groupId) {
        throw new ForbiddenException('You do not belong to this group');
      }
    }

    // 4. Check Partner ID Ownership (e.g., /partner/:partnerId/...)
    if (params.partnerId) {
      const targetPartnerId = parseInt(params.partnerId, 10);
      if (role === UserRole.PARTNER_ADMIN && targetPartnerId !== user.organisationId) {
        throw new ForbiddenException('You can only access your assigned partner organization');
      }
    }
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException(`Access denied: ${error.message}`);
    }
  }
}
