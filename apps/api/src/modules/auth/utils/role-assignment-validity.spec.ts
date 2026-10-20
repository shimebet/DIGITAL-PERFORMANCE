import { describe, expect, it } from 'vitest';

import {
  isRoleAssignmentCurrentlyValid,
} from './role-assignment-validity.js';

describe('Role assignment validity', () => {
  const now = new Date('2026-10-18T12:00:00.000Z');

  it('accepts assignments without validity limits', () => {
    expect(
      isRoleAssignmentCurrentlyValid(
        { validFrom: null, validTo: null },
        now,
      ),
    ).toBe(true);
  });

  it('accepts currently valid assignments', () => {
    expect(
      isRoleAssignmentCurrentlyValid(
        {
          validFrom: new Date('2026-10-01T00:00:00.000Z'),
          validTo: new Date('2026-11-01T00:00:00.000Z'),
        },
        now,
      ),
    ).toBe(true);
  });

  it('rejects future assignments', () => {
    expect(
      isRoleAssignmentCurrentlyValid(
        {
          validFrom: new Date('2026-11-01T00:00:00.000Z'),
          validTo: null,
        },
        now,
      ),
    ).toBe(false);
  });

  it('rejects expired assignments', () => {
    expect(
      isRoleAssignmentCurrentlyValid(
        {
          validFrom: null,
          validTo: new Date('2026-10-01T00:00:00.000Z'),
        },
        now,
      ),
    ).toBe(false);
  });

  it('accepts the exact start time', () => {
    expect(
      isRoleAssignmentCurrentlyValid(
        { validFrom: now },
        now,
      ),
    ).toBe(true);
  });

  it('rejects the exact end time', () => {
    expect(
      isRoleAssignmentCurrentlyValid(
        { validTo: now },
        now,
      ),
    ).toBe(false);
  });

  it('rejects invalid dates', () => {
    expect(
      isRoleAssignmentCurrentlyValid(
        { validFrom: 'invalid-date' },
        now,
      ),
    ).toBe(false);
  });
});
