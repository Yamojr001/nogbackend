import { Controller, Get } from '@nestjs/common';
import { BanksService } from './banks.service';

@Controller('banks')
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  @Get()
  async getBanks() {
    const banks = await this.banksService.findAll();
    return {
      status: 'success',
      data: banks,
    };
  }
}
