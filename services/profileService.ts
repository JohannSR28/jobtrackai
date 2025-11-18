import { ProfileRepository } from "@/repositories/ProfileRepository";

export class ProfileService {
  static async getProfile(userId: string) {
    if (!userId) throw new Error("Invalid user id");

    const profile = await ProfileRepository.findByUserId(userId);
    return profile;
  }

  static async updateProfile(userId: string, payload: { photo_url?: string }) {
    if (!userId) throw new Error("Invalid user id");

    const updatedProfile = await ProfileRepository.update(userId, payload);
    return updatedProfile;
  }
}
