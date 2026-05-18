import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const authUrl = process.env.NEXTJS_URL ?? 'http://localhost:3002';
    const headers: Record<string, string> = req.headers.authorization
      ? { authorization: req.headers.authorization }
      : { cookie: req.headers.cookie ?? '' };
    const res = await fetch(`${authUrl}/api/auth/get-session`, { headers });

    if (!res.ok) throw new UnauthorizedException();

    const session = await res.json();
    if (!session?.user) throw new UnauthorizedException();

    req.user = session.user;
    return true;
  }
}
