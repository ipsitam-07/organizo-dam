import { DataTypes, Model } from "sequelize";

export class ShareLink extends Model {
  declare id: string;
  declare asset_id: string;
  declare created_by: string;
  declare token: string;
  declare password_hash: string | null;
  declare max_downloads: number | null;
  declare download_count: number;
  declare expires_at: Date | null;
  declare readonly created_at: Date;

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
        created_by: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        token: {
          type: DataTypes.STRING,
          unique: true,
          allowNull: false,
        },
        password_hash: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        max_downloads: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        download_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        expires_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "share_links",
        timestamps: false,
      }
    );
  }
}
