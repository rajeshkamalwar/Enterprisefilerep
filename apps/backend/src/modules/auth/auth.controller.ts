import { Body, Controller, Post } from "@nestjs/common";

type LoginBody = {
  email: string;
  password: string;
};

@Controller("auth")
export class AuthController {
  @Post("login")
  login(@Body() body: LoginBody) {
    return {
      accessToken: "demo-access-token-replace-with-jwt",
      refreshToken: "demo-refresh-token-replace-with-revocable-session",
      user: {
        id: "user_demo_admin",
        email: body.email,
        fullName: "Demo Admin",
        roles: ["SUPER_ADMIN"]
      }
    };
  }

  @Post("logout")
  logout() {
    return {
      success: true,
      message: "Logout endpoint scaffolded. Token revocation comes with session storage."
    };
  }
}
