export const assetSchemas = {
  Asset: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      user_id: { type: "string", format: "uuid" },
      original_filename: { type: "string", example: "promo-video.mp4" },
      storage_key: { type: "string", example: "tus-abc123" },
      mime_type: { type: "string", example: "video/mp4" },
      size_bytes: { type: "integer", example: 104857600 },
      status: {
        type: "string",
        enum: ["queued", "processing", "ready", "failed"],
        example: "ready",
      },
      download_count: { type: "integer", example: 12 },
      created_at: { type: "string", format: "date-time" },
      updated_at: { type: "string", format: "date-time" },
      Tags: {
        type: "array",
        items: { $ref: "#/components/schemas/Tag" },
      },
      AssetRenditions: {
        type: "array",
        items: { $ref: "#/components/schemas/Rendition" },
      },
      AssetMetadata: { $ref: "#/components/schemas/AssetMetadata" },
    },
  },

  AssetMetadata: {
    type: "object",
    properties: {
      width: { type: "integer", example: 1920 },
      height: { type: "integer", example: 1080 },
      duration_secs: { type: "number", example: 125.4 },
      bitrate_kbps: { type: "integer", example: 5000 },
      video_codec: { type: "string", example: "h264" },
      audio_codec: { type: "string", example: "aac" },
      frame_rate: { type: "number", example: 29.97 },
      format: { type: "string", example: "mp4" },
      page_count: { type: "integer", example: 12 },
      raw_metadata: { type: "object" },
    },
  },

  Rendition: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      label: { type: "string", example: "thumbnail" },
      rendition_type: {
        type: "string",
        enum: ["image_rendition", "document_preview", "transcode"],
      },
      mime_type: { type: "string", example: "image/jpeg" },
      storage_key: { type: "string" },
      size_bytes: { type: "integer" },
      status: { type: "string", enum: ["processing", "ready", "failed"] },
    },
  },

  Tag: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string", example: "video" },
      source: { type: "string", enum: ["auto", "user"] },
    },
  },

  PaginatedAssets: {
    type: "object",
    properties: {
      data: {
        type: "array",
        items: { $ref: "#/components/schemas/Asset" },
      },
      total: { type: "integer", example: 84 },
      page: { type: "integer", example: 1 },
      limit: { type: "integer", example: 20 },
      totalPages: { type: "integer", example: 5 },
    },
  },

  ProcessingStatus: {
    type: "object",
    properties: {
      asset: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          status: {
            type: "string",
            enum: ["queued", "processing", "ready", "failed"],
          },
        },
      },
      jobs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            job_type: {
              type: "string",
              enum: [
                "assembly",
                "metadata",
                "thumbnail",
                "transcode",
                "image",
                "document",
              ],
            },
            status: {
              type: "string",
              enum: ["queued", "processing", "completed", "failed"],
            },
            progress: {
              type: "integer",
              minimum: 0,
              maximum: 100,
              example: 75,
            },
            error_message: { type: "string", nullable: true },
          },
        },
      },
    },
  },

  AdminStats: {
    type: "object",
    properties: {
      totalAssets: { type: "integer", example: 1024 },
      totalDownloads: { type: "integer", example: 8932 },
      totalStorageBytes: { type: "integer", example: 53687091200 },
      jobStats: {
        type: "array",
        items: {
          type: "object",
          properties: {
            job_type: { type: "string" },
            status: { type: "string" },
            count: { type: "integer" },
          },
        },
      },
    },
  },

  PresignedDownload: {
    type: "object",
    properties: {
      url: {
        type: "string",
        format: "uri",
        description: "Pre-signed MinIO URL, valid for 15 minutes",
        example:
          "https://minio.example.com/assets/tus-abc123?X-Amz-Signature=...",
      },
      expiresIn: {
        type: "integer",
        description: "Seconds until the URL expires",
        example: 900,
      },
    },
  },

  CreateShareLinkRequest: {
    type: "object",
    properties: {
      password: {
        type: "string",
        minLength: 4,
        maxLength: 72,
        description: "Optional password to protect the link",
        example: "mypassword",
      },
      max_downloads: {
        type: "integer",
        minimum: 1,
        maximum: 10000,
        description: "Maximum number of times the link can be used",
        example: 5,
      },
      expires_in_hours: {
        type: "integer",
        minimum: 1,
        maximum: 8760,
        description: "Hours until the link expires (max 365 days)",
        example: 24,
      },
    },
  },

  ShareLink: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      token: { type: "string", example: "a3f8c2d..." },
      asset_id: { type: "string", format: "uuid" },
      created_by: { type: "string", format: "uuid" },
      max_downloads: { type: "integer", nullable: true, example: 10 },
      download_count: { type: "integer", example: 3 },
      expires_at: { type: "string", format: "date-time", nullable: true },
      created_at: { type: "string", format: "date-time" },
    },
  },
} as const;

// Reusable parameter definitions referenced in multiple paths
const uuidPathParam = (name: string) => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
});

export const assetPaths = {
  "/api/assets": {
    get: {
      tags: ["Assets"],
      summary: "List assets with filters and pagination",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "page",
          in: "query",
          schema: { type: "integer", minimum: 1, default: 1 },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        },
        {
          name: "status",
          in: "query",
          schema: {
            type: "string",
            enum: ["queued", "processing", "ready", "failed"],
          },
        },
        {
          name: "mime_type",
          in: "query",
          schema: { type: "string", example: "video/mp4" },
        },
        {
          name: "tag",
          in: "query",
          schema: { type: "string", example: "video" },
        },
        {
          name: "date_from",
          in: "query",
          schema: { type: "string", format: "date-time" },
        },
        {
          name: "date_to",
          in: "query",
          schema: { type: "string", format: "date-time" },
        },
      ],
      responses: {
        "200": {
          description: "Paginated asset list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PaginatedAssets" },
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
        "422": {
          description: "Invalid query parameters",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ValidationErrorResponse" },
            },
          },
        },
      },
    },
  },

  "/api/assets/stats": {
    get: {
      tags: ["Admin"],
      summary: "Get platform-wide asset and job statistics",
      description: "Requires admin role.",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Platform statistics",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: { $ref: "#/components/schemas/AdminStats" },
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
        "403": {
          description: "Admin role required",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { error: "Forbidden" },
            },
          },
        },
      },
    },
  },

  "/api/assets/{id}": {
    get: {
      tags: ["Assets"],
      summary: "Get a single asset by ID",
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam("id")],
      responses: {
        "200": {
          description: "Asset found",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { data: { $ref: "#/components/schemas/Asset" } },
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
          description: "Asset not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },

    delete: {
      tags: ["Assets"],
      summary: "Delete an asset and all its renditions",
      description:
        "Permanently removes the asset from MinIO and the database. Also deletes all rendition files.",
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam("id")],
      responses: {
        "204": { description: "Asset deleted" },
        "401": {
          description: "Unauthorized",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        "404": {
          description: "Asset not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },

  "/api/assets/{id}/download": {
    get: {
      tags: ["Assets"],
      summary: "Get a pre-signed download URL",
      description:
        "Returns a pre-signed MinIO URL valid for 15 minutes.\n\nUse the optional `rendition` query param to download a specific rendition (e.g. `thumbnail`, `720p`) instead of the original file.",
      security: [{ bearerAuth: [] }],
      parameters: [
        uuidPathParam("id"),
        {
          name: "rendition",
          in: "query",
          required: false,
          schema: { type: "string", example: "thumbnail" },
          description: "Rendition label — omit to download the original file",
        },
      ],
      responses: {
        "200": {
          description: "Pre-signed URL",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PresignedDownload" },
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
          description: "Asset or rendition not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        "409": {
          description: "Asset not ready for download",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { error: "Asset is not ready for download" },
            },
          },
        },
      },
    },
  },

  "/api/assets/{id}/thumbnail": {
    get: {
      tags: ["Assets"],
      summary: "Get the thumbnail URL for an asset",
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam("id")],
      responses: {
        "200": {
          description: "Thumbnail URL",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { url: { type: "string", format: "uri" } },
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
          description: "Thumbnail not ready",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { message: "Thumbnail not ready" },
            },
          },
        },
      },
    },
  },

  "/api/assets/{id}/renditions": {
    get: {
      tags: ["Assets"],
      summary: "List all renditions for an asset",
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam("id")],
      responses: {
        "200": {
          description: "Rendition list",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Rendition" },
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
        "404": {
          description: "Asset not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },

  "/api/assets/{id}/status": {
    get: {
      tags: ["Assets"],
      summary: "Get processing status for an asset",
      description:
        "Returns the asset status and the status of every processing job (assembly, metadata, thumbnail, transcode, image, document).",
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam("id")],
      responses: {
        "200": {
          description: "Processing status",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: { $ref: "#/components/schemas/ProcessingStatus" },
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
          description: "Asset not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },

  "/api/assets/{id}/tags": {
    post: {
      tags: ["Assets"],
      summary: "Add a tag to an asset",
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam("id")],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name"],
              properties: {
                name: {
                  type: "string",
                  minLength: 1,
                  maxLength: 64,
                  example: "campaign-2025",
                },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Tag added",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { data: { $ref: "#/components/schemas/Tag" } },
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
          description: "Asset not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
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

  "/api/assets/{id}/tags/{tagId}": {
    delete: {
      tags: ["Assets"],
      summary: "Remove a tag from an asset",
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam("id"), uuidPathParam("tagId")],
      responses: {
        "204": { description: "Tag removed" },
        "401": {
          description: "Unauthorized",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        "404": {
          description: "Asset or tag not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },

  "/api/assets/{id}/share": {
    post: {
      tags: ["Assets"],
      summary: "Create a share link for an asset",
      description:
        "Creates a public share link that anyone can use to download the asset.\nOptionally protect with a password and/or set an expiry and download limit.",
      security: [{ bearerAuth: [] }],
      parameters: [uuidPathParam("id")],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateShareLinkRequest" },
            example: {
              password: "mypassword",
              max_downloads: 5,
              expires_in_hours: 24,
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Share link created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: { $ref: "#/components/schemas/ShareLink" },
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
          description: "Asset not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
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

  "/health/asset": {
    get: {
      tags: ["Assets"],
      summary: "Asset service health check",
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
