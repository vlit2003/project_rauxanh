import { Module } from '@nestjs/common';
import { HerdsController } from './herds.controller';
import { HerdsService } from './herds.service';

@Module({
  controllers: [HerdsController],
  providers: [HerdsService],
})
export class HerdsModule {}
