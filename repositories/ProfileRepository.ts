import { createClient } from "@/utils/supabase/server";
import type { Profile } from "@/types/profile";

export class ProfileRepository {
  static async findByUserId(userId: string): Promise<Profile> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) throw new Error(error.message);
    return data as Profile;
  }

  static async update(
    userId: string,
    payload: Partial<Profile>
  ): Promise<Profile> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Profile;
  }
}
