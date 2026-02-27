import { DataTypes, Model } from "sequelize";

export class AssetTag extends Model {
  declare asset_id: string;
  declare tag_id: string;
  declare tagged_by: string | null;
  declare readonly tagged_at: Date;

  static initialize(sequelize: any) {
    this.init(
      {
        asset_id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
        tag_id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
        tagged_by: { type: DataTypes.UUID, allowNull: true },
        tagged_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "asset_tags",
        timestamps: false,
        indexes: [
          {
            fields: ["tag_id"],
            name: "idx_asset_tags_tag",
          },
        ],
      }
    );
  }
}
