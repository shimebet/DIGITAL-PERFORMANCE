import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';

type DecimalInput = Prisma.Decimal | string | number;

export function validateAssignmentCapacity(
  parentValue: DecimalInput,
  allocatedValue: DecimalInput,
  requestedValue: DecimalInput,
): Prisma.Decimal {
  const parent = new Prisma.Decimal(parentValue);
  const allocated = new Prisma.Decimal(allocatedValue);
  const requested = new Prisma.Decimal(requestedValue);

  if (
    !parent.isFinite() ||
    !allocated.isFinite() ||
    !requested.isFinite()
  ) {
    throw new BadRequestException(
      'Target allocation values must be finite numbers',
    );
  }

  if (parent.isNegative() || allocated.isNegative()) {
    throw new BadRequestException(
      'Target allocation values cannot be negative',
    );
  }

  if (requested.lte(0)) {
    throw new BadRequestException(
      'Requested target allocation must be greater than zero',
    );
  }

  const remaining = parent.minus(allocated);

  if (remaining.isNegative()) {
    throw new BadRequestException(
      'Existing child allocations exceed the parent target',
    );
  }

  if (requested.gt(remaining)) {
    throw new BadRequestException(
      `Requested allocation exceeds remaining parent capacity (${remaining.toFixed(2)})`,
    );
  }

  return remaining.minus(requested);
}