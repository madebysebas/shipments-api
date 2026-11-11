import { ShipmentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateShipmentDto {
  @IsString() @IsNotEmpty() @MaxLength(64)
  reference: string;

  @IsString() @IsNotEmpty() @MaxLength(120)
  origin: string;

  @IsString() @IsNotEmpty() @MaxLength(120)
  destination: string;
}

export class AddEventDto {
  @IsEnum(ShipmentStatus)
  status: ShipmentStatus;

  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}

export class ListShipmentsQuery {
  @IsOptional() @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @IsOptional() @IsUUID()
  cursor?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 20;
}
