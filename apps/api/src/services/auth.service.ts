import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { userRepository } from "../repo/user.repo";
import { redisClient } from "./redis";
import { config } from "@repo/config";
import { ConflictError, UnauthorizedError } from "../utils/error";

export class AuthService {
  //Register
  async register(data: any) {
    const { email, password } = data;

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError("Email already in use");
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await userRepository.create({
      email,
      password_hash,
      role: "user",
      is_active: true,
    });

    return { id: newUser.id, email: newUser.email, role: newUser.role };
  }

  //login
  async login(data: any) {
    const { email, password } = data;

    const user = await userRepository.findByEmail(email);
    if (!user || !user.is_active) {
      throw new UnauthorizedError("Invalid credentials or inactive account");
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret as string,
      { expiresIn: config.jwt.expiry as any }
    );

    const redisKey = `session:${user.id}`;
    await redisClient.setEx(
      redisKey,
      parseInt(config.jwt.expiry as string, 10) || 86400,
      token
    );

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
}

export const authService = new AuthService();
