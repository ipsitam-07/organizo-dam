import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { userRepository } from "../repo/user.repo";
import { redisClient } from "@repo/auth";
import { config } from "@repo/config";
import { ConflictError, UnauthorizedError } from "@repo/auth";
import { RegisterInput, LoginInput } from "../schemas/auth.schema";

function parseExpiryToSeconds(expiry: string | undefined): number {
  if (!expiry) return 86400;
  const numeric = Number(expiry);
  if (!isNaN(numeric)) return numeric;
  const match = expiry.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 86400;
  const [, n, unit] = match;
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  return parseInt(n) * multipliers[unit];
}

export class AuthService {
  async register(data: RegisterInput) {
    const { email, password } = data;

    if (!config.jwt.secret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError("Email already in use");
    }

    const password_hash = await bcrypt.hash(password, 12);

    const newUser = await userRepository.create({
      email,
      password_hash,
      role: "user",
      is_active: true,
    });

    return { id: newUser.id, email: newUser.email, role: newUser.role };
  }

  async login(data: LoginInput) {
    const { email, password } = data;

    if (!config.jwt.secret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const user = await userRepository.findByEmail(email);
    if (!user || !user.is_active) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const expirySeconds = parseExpiryToSeconds(config.jwt.expiry);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: expirySeconds }
    );

    const redisKey = `session:${user.id}`;
    await redisClient.setEx(redisKey, expirySeconds, token);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      },
    };
  }

  async logout(userId: string): Promise<void> {
    const redisKey = `session:${userId}`;
    await redisClient.del(redisKey);
  }
}

export const authService = new AuthService();
