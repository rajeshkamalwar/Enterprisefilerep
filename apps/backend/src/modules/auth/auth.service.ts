import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { PrismaService } from "../database/prisma.service";

type LoginInput = {
  email: string;
  password: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user || user.status !== "ACTIVE") {
      await this.writeLoginFailure(input.email, "Invalid credentials or inactive account");
      throw new UnauthorizedException("Invalid email or password");
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

    if (!passwordMatches) {
      await this.writeLoginFailure(input.email, "Invalid password");
      throw new UnauthorizedException("Invalid email or password");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "LOGIN_SUCCESS",
        entityType: "user",
        entityId: user.id,
        entityName: user.email
      }
    });

    const roleCodes = user.roles.map((link) => link.role.code);
    const payload = {
      sub: user.id,
      email: user.email,
      roles: roleCodes
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: roleCodes
      }
    };
  }

  private async writeLoginFailure(email: string, reason: string) {
    await this.prisma.auditLog.create({
      data: {
        action: "LOGIN_FAILURE",
        entityType: "user",
        entityName: email.toLowerCase(),
        success: false,
        failureReason: reason
      }
    });
  }
}
