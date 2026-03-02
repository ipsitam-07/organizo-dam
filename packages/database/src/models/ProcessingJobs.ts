import { DataTypes, Model } from "sequelize";

export class ProcessingJob extends Model {
  declare id: string;
  declare asset_id: string;
  declare rendition_id: string | null;
  declare amqp_message_id: string;
  declare amqp_exchange: string;
  declare amqp_routing_key: string;
  declare amqp_queue: string;
  declare amqp_delivery_tag: number | null;
  declare job_type: string;
  declare status:
    | "queued"
    | "active"
    | "completed"
    | "failed"
    | "dead_lettered";
  declare attempts: number;
  declare max_attempts: number;
  declare error_message: string | null;
  declare progress: number;
  declare readonly queued_at: Date;
  declare started_at: Date | null;
  declare completed_at: Date | null;

  static initialize(sequelize: any) {
    this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        asset_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        rendition_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        amqp_message_id: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        amqp_exchange: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        amqp_routing_key: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        amqp_queue: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        amqp_delivery_tag: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },
        job_type: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        status: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: "queued",
        },
        attempts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        max_attempts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 3,
        },
        error_message: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        progress: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        queued_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        started_at: {
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
        tableName: "processing_jobs",
        timestamps: false,
        indexes: [
          {
            fields: ["asset_id", "job_type"],
            name: "idx_jobs_asset_type",
          },
          {
            fields: ["status"],
            name: "idx_jobs_status",
          },
          {
            fields: ["amqp_message_id"],
            name: "idx_jobs_message_id",
          },
        ],
      }
    );
  }
}
