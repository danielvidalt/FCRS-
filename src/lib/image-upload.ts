export const IMAGE_ACCEPT = "image/jpeg,image/png,image/jpg";

export function isValidImageFile(file: File): boolean {
  if (file.type === "image/jpeg" || file.type === "image/png") return true;
  return /\.(jpe?g|png)$/i.test(file.name);
}

export function firstValidImageFile(
  files: FileList | null | undefined
): File | null {
  if (!files?.length) return null;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (isValidImageFile(file)) return file;
  }
  return null;
}
