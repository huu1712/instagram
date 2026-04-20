import { getSessionUserId } from "@/lib/auth";
import { findUserById } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProfileForm } from "./ui";

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const user = findUserById(userId);
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Chỉnh sửa hồ sơ</h1>
        <p className="mt-1 text-sm text-zinc-500">Đặt tên hiển thị và ảnh đại diện.</p>
      </div>
      <ProfileForm defaultDisplayName={user.displayName} avatarUrl={user.avatarUrl} />
    </div>
  );
}
