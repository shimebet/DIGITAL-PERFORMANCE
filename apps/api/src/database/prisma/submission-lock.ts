
import { NotFoundException } from '@nestjs/common';

import type { Prisma } from '../../generated/prisma/client.js';

export interface LockedSubmission {
  id: string;
  status: string;
}

export async function lockSubmission(
  tx: Prisma.TransactionClient,
  submissionId: string,
): Promise<LockedSubmission> {
  const rows = await tx.$queryRaw<LockedSubmission[]>`
    SELECT
      id,
      status
    FROM daily_submissions
    WHERE id = ${submissionId}
    FOR UPDATE
  `;

  const submission = rows[0];

  if (!submission) {
    throw new NotFoundException(
      'Submission not found',
    );
  }

  return submission;
}
