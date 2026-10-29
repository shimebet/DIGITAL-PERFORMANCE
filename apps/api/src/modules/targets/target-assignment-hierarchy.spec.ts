
import { describe, expect, it } from 'vitest';
import { ScopeType } from '../../generated/prisma/enums.js';

import {
  validateParentRequirement,
  validateParentAssignment,
} from './target-assignment-hierarchy.js';

// ============================================================
// 1. TARGET ASSIGNMENT HIERARCHY REQUIREMENTS
// ============================================================

describe('Target assignment hierarchy requirements', () => {
  it('allows GLOBAL assignments without a parent', () => {
    expect(
      validateParentRequirement({
        scopeType: ScopeType.GLOBAL,
      }),
    ).toBeNull();
  });

  it('rejects GLOBAL assignments with a parent', () => {
    expect(() =>
      validateParentRequirement({
        scopeType: ScopeType.GLOBAL,
        parentAssignmentId: 'parent-id',
      }),
    ).toThrow('GLOBAL assignments must not have a parent');
  });

  it.each([
    [ScopeType.REGION, ScopeType.GLOBAL],
    [ScopeType.DISTRICT, ScopeType.REGION],
    [ScopeType.BRANCH, ScopeType.DISTRICT],
    [ScopeType.STAFF, ScopeType.BRANCH],
  ])(
    '%s requires a parent at %s scope',
    (scopeType, expectedParentScope) => {
      expect(() =>
        validateParentRequirement({
          scopeType,
        }),
      ).toThrow('require parentAssignmentId');

      expect(
        validateParentRequirement({
          scopeType,
          parentAssignmentId: 'parent-id',
        }),
      ).toBe(expectedParentScope);
    },
  );
});

// ============================================================
// 2. PARENT ASSIGNMENT VALIDATION
// ============================================================

describe('Parent assignment validation', () => {
  const parent = {
    id: 'parent-1',
    targetId: 'target-1',
    scopeType: ScopeType.REGION,
    regionId: 'region-1',
    districtId: null,
    branchId: null,
    userId: null,
    productId: null,
  };

  const child = {
    targetId: 'target-1',
    scopeType: ScopeType.DISTRICT,
    regionId: 'region-1',
    districtId: 'district-1',
    productId: null,
  };

  it('accepts a valid immediate parent', () => {
    expect(() =>
      validateParentAssignment(child, parent),
    ).not.toThrow();
  });

  it('rejects a parent from the wrong scope', () => {
    expect(() =>
      validateParentAssignment(child, {
        ...parent,
        scopeType: ScopeType.GLOBAL,
      }),
    ).toThrow('Invalid parent scope');
  });

  it('rejects a parent belonging to a different target', () => {
    expect(() =>
      validateParentAssignment(child, {
        ...parent,
        targetId: 'other-target',
      }),
    ).toThrow('different target');
  });

  it('rejects a parent with a different product', () => {
    expect(() =>
      validateParentAssignment(child, {
        ...parent,
        productId: 'product-1',
      }),
    ).toThrow('product does not match');
  });

  it('rejects a parent from another region', () => {
    expect(() =>
      validateParentAssignment(child, {
        ...parent,
        regionId: 'other-region',
      }),
    ).toThrow('does not match');
  });
});
