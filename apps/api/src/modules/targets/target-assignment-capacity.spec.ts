import { describe, expect, it } from 'vitest';
import { validateAssignmentCapacity } from './target-assignment-capacity.js';

describe('Target assignment capacity validation', () => {
  it('accepts an allocation within available capacity', () => {
    expect(
      validateAssignmentCapacity(1000, 700, 250).toFixed(2),
    ).toBe('50.00');
  });

  it('accepts an allocation equal to remaining capacity', () => {
    expect(
      validateAssignmentCapacity(1000, 700, 300).toFixed(2),
    ).toBe('0.00');
  });

  it('rejects an allocation exceeding available capacity', () => {
    expect(() =>
      validateAssignmentCapacity(1000, 700, 400),
    ).toThrow('exceeds remaining parent capacity');
  });

  it('rejects zero or negative requested allocations', () => {
    expect(() =>
      validateAssignmentCapacity(1000, 0, 0),
    ).toThrow('greater than zero');

    expect(() =>
      validateAssignmentCapacity(1000, 0, -10),
    ).toThrow('greater than zero');
  });

  it('rejects existing over-allocation', () => {
    expect(() =>
      validateAssignmentCapacity(1000, 1100, 50),
    ).toThrow('Existing child allocations exceed');
  });

  it('uses precise decimal arithmetic', () => {
    expect(
      validateAssignmentCapacity('0.30', '0.10', '0.20').toFixed(2),
    ).toBe('0.00');
  });

  it('rejects non-finite values', () => {
    expect(() =>
      validateAssignmentCapacity(1000, 0, Number.NaN),
    ).toThrow('finite numbers');
  });
});