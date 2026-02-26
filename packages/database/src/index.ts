import { createDbConnection } from "./db";
import { DatabaseConfig } from "./interfaces";
import { User } from "./models/User";
import { logger } from "@repo/logger";

export const initDb = async (config: DatabaseConfig) => {
  const sequelize = createDbConnection(config);

  User.initialize(sequelize);

  try {
    await sequelize.authenticate();
    logger.info("[Database] Connection established successfully.");

    if (process.env.NODE_ENV !== "production") {
      await sequelize.sync({ alter: true });
      logger.info("[Database] Schema synchronized.");
    }
  } catch (error) {
    logger.error("[Database] Unable to connect:", { error });
    throw error;
  }

  return { sequelize, User };
};

// Exporting everything
export * from "./db";
export * from "./interfaces";
export * from "./models/User";
