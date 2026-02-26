import { DataTypes, Model } from "sequelize";

export class User extends Model {
  public id!: string;
  public email!: string;
  public password_hash!: string;
  public role!: "user" | "admin";
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static initialize(sequelize: any) {
    this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        email: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
          validate: { isEmail: true },
        },
        password_hash: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        role: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: "user",
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        sequelize,
        tableName: "users",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
      }
    );
  }
}
