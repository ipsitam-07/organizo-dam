import { DataTypes, Model } from "sequelize";

export class Tag extends Model {
  declare id: string;
  declare name: string;
  declare source: string;
  declare readonly created_at: Date;

  static initialize(sequelize: any) {
    this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          unique: true,
          allowNull: false,
        },
        source: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: "user",
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "tags",
        timestamps: false,
      }
    );
  }
}
