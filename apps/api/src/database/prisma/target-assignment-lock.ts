import { NotFoundException } from '@nestjs/common';

import type {
  Prisma,
} from '../../generated/prisma/client.js';

/**
 * Lock a parent target assignment for the duration
 * of the current database transaction.
 *
 * All child-allocation writers must acquire this lock
 * before calculating or changing the parent's capacity.
 */
export async function lockTargetAssignment(
  tx: Prisma.TransactionClient,
  parentAssignmentId: string,
): Promise<void> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM target_assignments
    WHERE id = ${parentAssignmentId}
    FOR UPDATE
  `;

  if (rows.length === 0) {
    throw new NotFoundException(
      'Parent target assignment not found',
    );
  }
}