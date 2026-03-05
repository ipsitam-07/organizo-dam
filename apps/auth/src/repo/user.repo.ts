import { User } from "@repo/database";

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return User.findOne({ where: { email } });
  }

  async create(userData: Partial<User>): Promise<User> {
    return User.create(userData as any);
  }
}

export const userRepository = new UserRepository();
