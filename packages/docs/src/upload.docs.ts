export const uploadSchemas = {
  UploadSession: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      user_id: { type: "string", format: "uuid" },
      tus_upload_id: { type: "string", example: "tus-abc123" },
      original_filename: { type: "string", example: "promo-video.mp4" },
      mime_type: { type: "string", example: "video/mp4" },
      total_size_bytes: { type: "integer", example: 104857600 },
      status: {
        type: "string",
        enum: ["initiated", "uploading", "complete", "failed"],
        example: "complete",
      },
      created_at: { type: "string", format: "date-time" },
      completed_at: { type: "string", format: "date-time", nullable: true },
    },
  },
} as const;

export const uploadPaths = {
  "/api/upload": {
    post: {
      tags: ["Upload"],
      summary: "Initiate a TUS resumable upload",
      description:
        "Follows the [TUS protocol](https://tus.io/protocols/resumable-upload).\n\n**Required TUS headers:**\n- `Tus-Resumable: 1.0.0`\n- `Upload-Length: <file size in bytes>`\n- `Upload-Metadata: filename <base64>,filetype <base64>`\n\n**Allowed mime types:** video/mp4, video/quicktime, video/webm, video/x-matroska, video/mpeg, video/3gpp, audio/mpeg, audio/wav, audio/ogg, audio/aac, audio/flac, image/jpeg, image/png, image/webp, image/gif, image/tiff, image/avif, application/pdf\n\nUnsupported mime types are rejected with 422 before any bytes are transferred.",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "Tus-Resumable",
          in: "header",
          required: true,
          schema: { type: "string", example: "1.0.0" },
        },
        {
          name: "Upload-Length",
          in: "header",
          required: true,
          schema: { type: "integer", example: 104857600 },
        },
        {
          name: "Upload-Metadata",
          in: "header",
          required: true,
          schema: {
            type: "string",
            description: "Comma-separated base64-encoded key-value pairs",
            example: "filename cHJvbW8ubXA0,filetype dmlkZW8vbXA0",
          },
        },
      ],
      responses: {
        "201": {
          description:
            "Upload created — use the `Location` header URL for PATCH requests",
          headers: {
            Location: {
              schema: { type: "string", example: "/api/upload/tus-abc123" },
            },
            "Tus-Resumable": { schema: { type: "string", example: "1.0.0" } },
          },
        },
        "401": {
          description: "Unauthorized",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        "422": {
          description: "Unsupported file type or missing metadata",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { error: 'Unsupported file type "application/zip"' },
            },
          },
        },
      },
    },
  },

  "/api/upload/{uploadId}": {
    patch: {
      tags: ["Upload"],
      summary: "Upload a chunk (TUS PATCH)",
      description:
        "Append bytes to an existing upload. Use `Upload-Offset` to resume interrupted uploads from where they left off.",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "uploadId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "Tus-Resumable",
          in: "header",
          required: true,
          schema: { type: "string", example: "1.0.0" },
        },
        {
          name: "Upload-Offset",
          in: "header",
          required: true,
          schema: { type: "integer", example: 0 },
        },
        {
          name: "Content-Type",
          in: "header",
          required: true,
          schema: {
            type: "string",
            example: "application/offset+octet-stream",
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/offset+octet-stream": {
            schema: { type: "string", format: "binary" },
          },
        },
      },
      responses: {
        "204": {
          description: "Chunk accepted",
          headers: { "Upload-Offset": { schema: { type: "integer" } } },
        },
        "409": { description: "Offset conflict" },
        "410": { description: "Upload no longer exists" },
      },
    },

    head: {
      tags: ["Upload"],
      summary: "Get upload offset (TUS HEAD — resume check)",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "uploadId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "Tus-Resumable",
          in: "header",
          required: true,
          schema: { type: "string", example: "1.0.0" },
        },
      ],
      responses: {
        "200": {
          description: "Current upload offset",
          headers: {
            "Upload-Offset": { schema: { type: "integer" } },
            "Upload-Length": { schema: { type: "integer" } },
          },
        },
      },
    },
  },

  "/api/upload/sessions": {
    get: {
      tags: ["Upload"],
      summary: "List all upload sessions for the current user",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Upload sessions",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/UploadSession" },
                  },
                },
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },

  "/api/upload/sessions/{id}": {
    get: {
      tags: ["Upload"],
      summary: "Get a specific upload session",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: {
        "200": {
          description: "Upload session",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: { $ref: "#/components/schemas/UploadSession" },
                },
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        "404": {
          description: "Session not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },

  "/api/upload/sessions/{id}/cancel": {
    post: {
      tags: ["Upload"],
      summary: "Cancel an in-progress upload session",
      description:
        "Marks the session as failed. Cannot cancel a session that has already completed.",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: {
        "200": {
          description: "Session cancelled",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    example: "Upload cancelled successfully",
                  },
                  data: { $ref: "#/components/schemas/UploadSession" },
                },
              },
            },
          },
        },
        "400": {
          description: "Cannot cancel a completed upload",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { error: "Cannot cancel a completed upload" },
            },
          },
        },
        "401": {
          description: "Unauthorized",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        "404": {
          description: "Session not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },

  "/health/upload": {
    get: {
      tags: ["Upload"],
      summary: "Upload service health check",
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
