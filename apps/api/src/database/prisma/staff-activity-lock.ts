
import { NotFoundException } from '@nestjs/common';

import type { Prisma } from '../../generated/prisma/client.js';

export async function lockStaffActivity(
  tx: Prisma.TransactionClient,
  staffUserId: string,
): Promise<void> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM users
    WHERE id = ${staffUserId}
    FOR UPDATE
  `;

  if (rows.length === 0) {
    throw new NotFoundException(
      'Staff user not found',
    );
  }
}
