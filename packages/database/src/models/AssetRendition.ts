import { DataTypes, Model } from "sequelize";

export class AssetRendition extends Model {
  declare id: string;
  declare asset_id: string;
  declare rendition_type: string;
  declare label: string;
  declare storage_key: string;
  declare mime_type: string;
  declare size_bytes: number | null;
  declare width: number | null;
  declare height: number | null;
  declare duration_secs: number | null;
  declare status: "pending" | "processing" | "ready" | "failed";

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
        rendition_type: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        label: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        storage_key: {
          type: DataTypes.STRING,
          unique: true,
          allowNull: false,
        },
        mime_type: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        size_bytes: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },
        width: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        height: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        duration_secs: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },
        status: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: "pending",
        },
      },
      {
        sequelize,
        tableName: "asset_renditions",
        timestamps: true,
        updatedAt: false,
        indexes: [
          {
            unique: true,
            fields: ["asset_id", "rendition_type", "label"],
            name: "uq_asset_rendition",
          },
        ],
      }
    );
  }
}
