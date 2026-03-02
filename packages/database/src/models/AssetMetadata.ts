import { DataTypes, Model } from "sequelize";

export class AssetMetadata extends Model {
  declare id: string;
  declare asset_id: string;
  declare width: number | null;
  declare height: number | null;
  declare format: string | null;
  declare duration_secs: number | null;
  declare bitrate_kbps: number | null;
  declare video_codec: string | null;
  declare audio_codec: string | null;
  declare frame_rate: number | null;
  declare page_count: number | null;
  declare raw_metadata: object | null;
  declare readonly extracted_at: Date;

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
          unique: true,
          allowNull: false,
        },
        width: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        height: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        format: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        duration_secs: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },
        bitrate_kbps: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        video_codec: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        audio_codec: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        frame_rate: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },
        page_count: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        raw_metadata: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        extracted_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "asset_metadata",
        timestamps: false,
      }
    );
  }
}
