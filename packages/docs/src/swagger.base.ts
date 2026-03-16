import { SwaggerDocOptions } from "./types";

const commonSchemas = {
  ErrorResponse: {
    type: "object",
    properties: {
      error: { type: "string", example: "Not found" },
    },
  },

  ValidationErrorResponse: {
    type: "object",
    properties: {
      error: { type: "string", example: "Validation failed" },
      details: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field: { type: "string" },
            message: { type: "string" },
          },
        },
      },
    },
  },
};

export function buildSwaggerDoc(options: SwaggerDocOptions): object {
  return {
    openapi: "3.0.3",
    info: {
      title: options.title,
      description: options.description,
      version: "1.0.0",
      contact: { name: "Organizo DAM" },
    },
    servers: [
      {
        url: options.serverUrl,
        description: options.serverDescription,
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
      schemas: {
        ...commonSchemas,
        ...options.schemas,
      },
    },
    tags: [
      {
        name: "Auth",
        description: "Registration, login, logout and current user",
      },
      {
        name: "Assets",
        description:
          "Asset management — list, retrieve, delete, download, tags, share links",
      },
      {
        name: "Upload",
        description: "TUS resumable upload and session management",
      },
      {
        name: "Share",
        description:
          "Public share link resolution (no authentication required)",
      },
    ],
    paths: options.paths,
  };
}
