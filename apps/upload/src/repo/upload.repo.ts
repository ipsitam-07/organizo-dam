import { CreationAttributes } from "sequelize";
import { Asset, UploadSession } from "@repo/database";

export class UploadRepository {
  async createUploadSession(data: CreationAttributes<UploadSession>) {
    return await UploadSession.create(data);
  }

  async findSessionByTusId(tusUploadId: string) {
    return await UploadSession.findOne({
      where: { tus_upload_id: tusUploadId },
    });
  }

  async findSessionByIdAndUser(sessionId: string, userId: string) {
    return await UploadSession.findOne({
      where: { id: sessionId, user_id: userId },
    });
  }

  async updateSessionStatus(
    session: UploadSession,
    status: UploadSession["status"],
    additionalData: { completed_at?: Date } = {}
  ) {
    return await session.update({ status, ...additionalData });
  }

  async getUserSessions(userId: string) {
    return await UploadSession.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
    });
  }

  async createAsset(data: CreationAttributes<Asset>) {
    return await Asset.create(data);
  }
}

export const uploadRepository = new UploadRepository();
