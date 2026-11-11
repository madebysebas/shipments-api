import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ShipmentsController } from './shipments/shipments.controller';
import { ShipmentsService } from './shipments/shipments.service';

@Module({
  controllers: [ShipmentsController],
  providers: [PrismaService, ShipmentsService],
})
export class AppModule {}

// Shared by main.ts and the e2e tests so both run with the same pipes.
export function configureApp(app: INestApplication) {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
}
