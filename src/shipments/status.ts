import { ShipmentStatus } from '@prisma/client';

// DELIVERED and CANCELLED are terminal: a shipment never leaves them.
export const TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  CREATED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const canTransition = (from: ShipmentStatus, to: ShipmentStatus) =>
  TRANSITIONS[from].includes(to);
