import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('sign-in')
  async signIn(@Body() body: { email: string; password: string }) {
    const nextUrl = process.env.NEXTJS_URL ?? 'http://localhost:3002';
    const res = await fetch(`${nextUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });
    if (!res.ok) throw new UnauthorizedException('Invalid credentials');
    const data = await res.json();
    if (!data.token) throw new UnauthorizedException('Authentication failed');
    return { token: data.token, user: data.user };
  }
}
