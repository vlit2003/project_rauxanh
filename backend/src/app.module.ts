import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UnitsModule } from './units/units.module';
import { BatchesModule } from './batches/batches.module';
import { HerdsModule } from './herds/herds.module';
import { TransfersModule } from './transfers/transfers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UnitsModule,
    BatchesModule,
    HerdsModule,
    TransfersModule,
  ],
})
export class AppModule {}
