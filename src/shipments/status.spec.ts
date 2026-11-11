import { canTransition } from './status';

describe('canTransition', () => {
  it.each([
    ['CREATED', 'IN_TRANSIT'],
    ['CREATED', 'CANCELLED'],
    ['IN_TRANSIT', 'DELIVERED'],
    ['IN_TRANSIT', 'CANCELLED'],
  ] as const)('allows %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    ['CREATED', 'DELIVERED'],
    ['CREATED', 'CREATED'],
    ['IN_TRANSIT', 'CREATED'],
    ['DELIVERED', 'CANCELLED'],
    ['DELIVERED', 'IN_TRANSIT'],
    ['CANCELLED', 'CREATED'],
  ] as const)('rejects %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });
});
