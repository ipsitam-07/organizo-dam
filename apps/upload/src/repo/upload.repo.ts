import { Asset, UploadSession } from "@repo/database";

export class UploadRepository {
  async createUploadSession(data: any) {
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
    session: any,
    status: string,
    additionalData: any = {}
  ) {
    return await session.update({ status, ...additionalData });
  }

  async getUserSessions(userId: string) {
    return await UploadSession.findAll({
      where: { user_id: userId },
      order: [["createdAt", "DESC"]],
    });
  }

  async createAsset(data: any) {
    return await Asset.create(data);
  }
}

export const uploadRepository = new UploadRepository();
