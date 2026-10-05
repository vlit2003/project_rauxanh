import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: number;
  username: string;
  roleCode: string;
  unitId: number | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  // Giá trị trả về gắn vào request.user, dùng cho RolesGuard và assertUnitScope.
  async validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      username: payload.username,
      roleCode: payload.roleCode,
      unitId: payload.unitId,
    };
  }
}
