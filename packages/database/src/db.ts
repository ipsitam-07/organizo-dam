import { Sequelize } from "sequelize";
import { DatabaseConfig } from "./interfaces";

export const createDbConnection = (config: DatabaseConfig): Sequelize => {
  return new Sequelize(config.database, config.user, config.password || "", {
    host: config.host,
    port: config.port,
    dialect: "postgres",
    logging: config.logging !== false ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
};
