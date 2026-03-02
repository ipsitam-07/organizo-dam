import { DataTypes, Model } from "sequelize";

export class UploadChunk extends Model {
  declare id: string;
  declare upload_session_id: string;
  declare chunk_index: number;
  declare offset_start: number;
  declare offset_end: number;
  declare size_bytes: number;
  declare chunk_storage_key: string;
  declare checksum_sha256: string | null;
  declare status: "received" | "verified" | "assembled" | "failed";
  declare received_at: Date;

  static initialize(sequelize: any) {
    this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        upload_session_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        chunk_index: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        offset_start: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        offset_end: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        size_bytes: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        chunk_storage_key: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        checksum_sha256: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        status: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: "received",
        },
        received_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "upload_chunks",
        timestamps: false,
        indexes: [
          {
            unique: true,
            fields: ["upload_session_id", "chunk_index"],
            name: "uq_session_chunk",
          },
          {
            fields: ["upload_session_id", "offset_start"],
            name: "idx_chunks_offset",
          },
        ],
      }
    );
  }
}
