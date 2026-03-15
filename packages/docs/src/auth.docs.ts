export const authSchemas = {
  RegisterRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email", example: "alice@example.com" },
      password: { type: "string", minLength: 8, example: "supersecret123" },
    },
  },

  RegisterResponse: {
    type: "object",
    properties: {
      message: { type: "string", example: "User registered successfully" },
      user: { $ref: "#/components/schemas/UserPublic" },
    },
  },

  LoginRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email", example: "alice@example.com" },
      password: { type: "string", example: "supersecret123" },
    },
  },

  LoginResponse: {
    type: "object",
    properties: {
      message: { type: "string", example: "Login successful" },
      token: {
        type: "string",
        description: "JWT — include as Authorization: Bearer <token>",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      },
      user: { $ref: "#/components/schemas/UserPublic" },
    },
  },

  UserPublic: {
    type: "object",
    properties: {
      id: {
        type: "string",
        format: "uuid",
        example: "550e8400-e29b-41d4-a716-446655440000",
      },
      email: { type: "string", format: "email", example: "alice@example.com" },
      role: { type: "string", enum: ["user", "admin"], example: "user" },
      is_active: { type: "boolean", example: true },
    },
  },
} as const;

export const authPaths = {
  "/api/auth/register": {
    post: {
      tags: ["Auth"],
      summary: "Register a new user",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/RegisterRequest" },
          },
        },
      },
      responses: {
        "201": {
          description: "User registered successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterResponse" },
            },
          },
        },
        "409": {
          description: "Email already in use",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { error: "Email already in use" },
            },
          },
        },
        "422": {
          description: "Validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ValidationErrorResponse" },
            },
          },
        },
      },
    },
  },

  "/api/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "Login and receive a JWT",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/LoginRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Login successful",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginResponse" },
            },
          },
        },
        "401": {
          description: "Invalid credentials or inactive account",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { error: "Invalid credentials" },
            },
          },
        },
      },
    },
  },

  "/api/auth/logout": {
    post: {
      tags: ["Auth"],
      summary: "Logout and invalidate the current session",
      description:
        "Deletes the server-side Redis session. The JWT becomes immediately invalid even before its expiry.",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Logged out successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    example: "Logged out successfully",
                  },
                },
              },
            },
          },
        },
        "401": {
          description: "Missing or invalid token",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },

  "/api/auth/me": {
    get: {
      tags: ["Auth"],
      summary: "Get the currently authenticated user",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Current user profile",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    example: "Profile retrieved successfully",
                  },
                  user: { $ref: "#/components/schemas/UserPublic" },
                },
              },
            },
          },
        },
        "401": {
          description: "Missing or invalid token",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },

  "/health/auth": {
    get: {
      tags: ["Auth"],
      summary: "Auth service health check",
      responses: {
        "200": {
          description: "OK",
          content: {
            "text/plain": { schema: { type: "string", example: "OK" } },
          },
        },
      },
    },
  },
} as const;
