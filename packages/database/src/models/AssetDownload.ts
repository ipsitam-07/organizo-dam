import { DataTypes, Model } from "sequelize";

export class AssetDownload extends Model {
  declare id: string;
  declare asset_id: string;
  declare user_id: string | null;
  declare rendition_id: string | null;
  declare share_link_id: string | null;
  declare ip_address: string | null;
  declare user_agent: string | null;
  declare readonly downloaded_at: Date;

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
        user_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        rendition_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        share_link_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        ip_address: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        user_agent: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        downloaded_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "asset_downloads",
        timestamps: false,
        indexes: [
          {
            fields: ["asset_id"],
            name: "idx_downloads_asset",
          },
          {
            fields: ["asset_id", "downloaded_at"],
            name: "idx_downloads_asset_time",
          },
        ],
      }
    );
  }
}
