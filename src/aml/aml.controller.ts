import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Request } from 'express';
import { AmlService } from './aml.service';
import { AmlFlagStatus } from './entities/aml-flag.entity';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Auditable } from '../audit/decorators/auditable.decorator';

export class ReviewFlagDto {
  @IsEnum(AmlFlagStatus)
  status: AmlFlagStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('admin/aml')
export class AmlController {
  constructor(private readonly amlService: AmlService) {}

  @Get()
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.amlService.findAll(+page, +limit);
  }

  @Get('pending')
  findPending(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.amlService.findPending(+page, +limit);
  }

  @Get('merchant/:merchantId')
  findByMerchant(@Param('merchantId') merchantId: string) {
    return this.amlService.findByMerchant(merchantId);
  }

  @Patch(':id/review')
  @Auditable({ action: 'AML_FLAG_REVIEWED', resource: 'aml_flag' })
  review(
    @Param('id') id: string,
    @Body() dto: ReviewFlagDto,
    @Req() req: Request & { user?: { merchantId?: string; id?: string; email?: string } },
  ) {
    const reviewedBy = req.user?.merchantId ?? req.user?.id ?? req.user?.email;
    if (!reviewedBy) {
      throw new UnauthorizedException('Authenticated reviewer identity is required');
    }
    return this.amlService.review(id, dto.status, reviewedBy, dto.note);
  }
}
