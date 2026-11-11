import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule, configureApp } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

// Runs against a real PostgreSQL (DATABASE_URL), not mocks.
describe('Shipments API (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    await app.get(PrismaService).shipment.deleteMany();
    http = request(app.getHttpServer());
  });

  afterAll(() => app.close());

  const newShipment = (reference: string) =>
    http.post('/shipments').send({ reference, origin: 'Bogotá', destination: 'Miami' });

  it('creates a shipment with its first event', async () => {
    const res = await newShipment('REF-1').expect(201);
    expect(res.body).toMatchObject({ reference: 'REF-1', status: 'CREATED' });
    expect(res.body.events).toHaveLength(1);
  });

  it('rejects a duplicate reference', () => newShipment('REF-1').expect(409));

  it('rejects an invalid body', () => http.post('/shipments').send({ reference: '' }).expect(400));

  it('returns 404 for an unknown shipment', () =>
    http.get('/shipments/7b1f6f0e-3c1a-4c53-9d0e-2a4a8a1b2c3d').expect(404));

  it('moves a shipment through its lifecycle and keeps the history', async () => {
    const { body } = await newShipment('REF-2').expect(201);
    const events = `/shipments/${body.id}/events`;

    await http.post(events).send({ status: 'DELIVERED' }).expect(409); // skips IN_TRANSIT
    await http.post(events).send({ status: 'IN_TRANSIT', note: 'Left origin port' }).expect(201);
    const delivered = await http.post(events).send({ status: 'DELIVERED' }).expect(201);

    expect(delivered.body.status).toBe('DELIVERED');
    expect(delivered.body.events.map((e: { status: string }) => e.status)).toEqual([
      'CREATED',
      'IN_TRANSIT',
      'DELIVERED',
    ]);
    await http.post(events).send({ status: 'CANCELLED' }).expect(409); // terminal state
  });

  it('applies the same transition only once when it arrives twice at the same time', async () => {
    const { body } = await newShipment('REF-3').expect(201);
    const events = `/shipments/${body.id}/events`;

    const results = await Promise.all([
      http.post(events).send({ status: 'IN_TRANSIT' }),
      http.post(events).send({ status: 'IN_TRANSIT' }),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const final = await http.get(`/shipments/${body.id}`).expect(200);
    expect(final.body.events).toHaveLength(2);
  });

  it('paginates with a cursor and filters by status', async () => {
    const first = await http.get('/shipments?limit=2').expect(200);
    expect(first.body.items).toHaveLength(2);
    expect(first.body.nextCursor).toBeTruthy();

    const second = await http.get(`/shipments?limit=2&cursor=${first.body.nextCursor}`).expect(200);
    expect(second.body.items).toHaveLength(1);
    expect(second.body.nextCursor).toBeNull();

    const delivered = await http.get('/shipments?status=DELIVERED').expect(200);
    expect(delivered.body.items.map((s: { reference: string }) => s.reference)).toEqual(['REF-2']);
  });
});
