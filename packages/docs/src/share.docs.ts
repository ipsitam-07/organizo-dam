export const sharePaths = {
  "/api/share/{token}": {
    get: {
      tags: ["Share"],
      summary: "Resolve a public share link",
      description:
        "No authentication required. If the link is password-protected, include the password in the request body.\n\nReturns a pre-signed download URL valid for 15 minutes.",
      parameters: [
        {
          name: "token",
          in: "path",
          required: true,
          schema: { type: "string", example: "a3f8c2d1b4e5..." },
        },
      ],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                password: { type: "string", example: "mypassword" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Download URL",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/PresignedDownload" },
                  {
                    type: "object",
                    properties: {
                      filename: { type: "string", example: "promo-video.mp4" },
                    },
                  },
                ],
              },
            },
          },
        },
        "401": {
          description: "Password required or incorrect",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { error: "Password required" },
            },
          },
        },
        "404": {
          description: "Share link not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        "410": {
          description: "Share link has expired or hit its download limit",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { error: "Share link has expired" },
            },
          },
        },
      },
    },
  },
} as const;
