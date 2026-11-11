import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AddEventDto, CreateShipmentDto, ListShipmentsQuery } from './dto';
import { canTransition } from './status';

@Injectable()
export class ShipmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateShipmentDto) {
    try {
      return await this.prisma.shipment.create({
        data: { ...dto, events: { create: { status: 'CREATED' } } },
        include: { events: true },
      });
    } catch (e) {
      // P2002 = unique constraint: the reference is the client's idempotency key.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Shipment with reference "${dto.reference}" already exists`);
      }
      throw e;
    }
  }

  async list({ status, cursor, limit }: ListShipmentsQuery) {
    // Fetch one extra row to know whether there is a next page.
    const rows = await this.prisma.shipment.findMany({
      where: { status },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
    const items = rows.slice(0, limit);
    return { items, nextCursor: rows.length > limit ? items[items.length - 1].id : null };
  }

  async get(id: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });
    if (!shipment) throw new NotFoundException(`Shipment ${id} not found`);
    return shipment;
  }

  async addEvent(id: string, { status, note }: AddEventDto) {
    const current = await this.get(id);
    if (!canTransition(current.status, status)) {
      throw new ConflictException(`Cannot move shipment from ${current.status} to ${status}`);
    }

    await this.prisma.$transaction(async (tx) => {
      // Conditional update: if another request changed the status first, count is 0.
      const { count } = await tx.shipment.updateMany({
        where: { id, status: current.status },
        data: { status },
      });
      if (count === 0) throw new ConflictException('Shipment status changed, retry the request');
      await tx.shipmentEvent.create({ data: { shipmentId: id, status, note } });
    });

    return this.get(id);
  }
}
