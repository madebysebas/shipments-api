import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { AddEventDto, CreateShipmentDto, ListShipmentsQuery } from './dto';
import { ShipmentsService } from './shipments.service';

@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipments: ShipmentsService) {}

  @Post()
  create(@Body() dto: CreateShipmentDto) {
    return this.shipments.create(dto);
  }

  @Get()
  list(@Query() query: ListShipmentsQuery) {
    return this.shipments.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.shipments.get(id);
  }

  @Post(':id/events')
  addEvent(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddEventDto) {
    return this.shipments.addEvent(id, dto);
  }
}
