import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";

type LoginBody = {
  email: string;
  password: string;
};

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  login(@Body() body: LoginBody) {
    return this.auth.login(body);
  }

  @Post("logout")
  logout() {
    return {
      success: true,
      message: "Logout endpoint scaffolded. Token revocation comes with session storage."
    };
  }
}
