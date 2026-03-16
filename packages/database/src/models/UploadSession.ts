import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";

export class UploadSession extends Model<
  InferAttributes<UploadSession>,
  InferCreationAttributes<UploadSession>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare tus_upload_id: string;
  declare upload_url: string;
  declare original_filename: string;
  declare mime_type: string;
  declare total_size_bytes: number;
  declare bytes_received: CreationOptional<number>;
  declare storage_key: string | null;
  declare status: CreationOptional<
    "initiated" | "uploading" | "assembling" | "complete" | "expired" | "failed"
  >;
  declare amqp_message_id: string | null;
  declare expires_at: Date | null;
  declare completed_at: Date | null;

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
        tus_upload_id: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        upload_url: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        original_filename: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        mime_type: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        total_size_bytes: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        bytes_received: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },
        storage_key: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        status: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: "initiated",
        },
        amqp_message_id: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        expires_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        completed_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "upload_sessions",
        timestamps: true,
        indexes: [
          {
            unique: true,
            fields: ["tus_upload_id"],
            name: "upload_sessions_tus_id_unique",
          },
          {
            unique: true,
            fields: ["storage_key"],
            name: "upload_sessions_storage_key_unique",
          },
        ],
      }
    );
  }
}
