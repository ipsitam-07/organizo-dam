import { DataTypes, Model } from "sequelize";

export class Asset extends Model {
  declare id: string;
  declare user_id: string;
  declare upload_session_id: string | null;
  declare original_filename: string;
  declare storage_key: string;
  declare mime_type: string;
  declare size_bytes: number;
  declare status: "queued" | "processing" | "ready" | "failed";
  declare download_count: number;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;

  static initialize(sequelize: any) {
    this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        upload_session_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        original_filename: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        storage_key: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        mime_type: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        size_bytes: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        status: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: "queued",
        },
        download_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        tableName: "assets",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
          {
            unique: true,
            fields: ["storage_key"],
            name: "assets_storage_key_unique",
          },
          {
            fields: ["user_id", "created_at"],
            name: "idx_assets_user_created",
          },
          {
            fields: ["user_id", "status"],
            name: "idx_assets_user_status",
          },
          {
            fields: ["status", "created_at"],
            name: "idx_assets_status_created",
          },
        ],
      }
    );
  }
}
