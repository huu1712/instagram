import { NewPostForm } from "./ui";

export default function NewPostPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Đăng bài mới</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Chọn một hoặc nhiều ảnh/video, thêm chú thích (tùy chọn).
        </p>
      </div>
      <NewPostForm />
    </div>
  );
}
