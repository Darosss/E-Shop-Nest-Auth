import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { databaseConfig } from './configs/';

@Module({
  imports: [TypeOrmModule.forRoot(databaseConfig), AuthModule],
})
export class AppModule {}
