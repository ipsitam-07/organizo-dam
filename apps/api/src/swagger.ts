import swaggerJsdoc from "swagger-jsdoc";
import { config } from "@repo/config";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Organizo DAM - Auth Service API",
      version: "1.0.0",
      description:
        "API documentation for the Digital Asset Management Platform Authentication Service.",
    },
    servers: [
      {
        url: `http://localhost:${config.ports.auth}`,
        description: "Local Docker Environment",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  // Tells Swagger to look inside your routes folder for the @openapi comments
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
