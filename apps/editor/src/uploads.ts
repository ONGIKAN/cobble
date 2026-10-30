export interface UploadAsset {
  name: string;
  kind: 'image' | 'audio';
  dataUrl: string;
}

export type UploadResult =
  | { ok: true; asset: UploadAsset }
  | { ok: false; reason: 'unsupported' | 'tooLarge' | 'read' };

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm', 'audio/mp4'];

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

export function baseName(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

/** 把用户选择的文件读成工程内联素材（图片 ≤2MB，音频 ≤5MB） */
export async function uploadToAsset(file: File): Promise<UploadResult> {
  const kind: 'image' | 'audio' = file.type.startsWith('audio/') ? 'audio' : 'image';
  const allowed = kind === 'audio' ? AUDIO_TYPES : IMAGE_TYPES;
  if (!allowed.includes(file.type)) return { ok: false, reason: 'unsupported' };
  const limit = kind === 'audio' ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) return { ok: false, reason: 'tooLarge' };
  try {
    const dataUrl = await readAsDataUrl(file);
    return { ok: true, asset: { name: baseName(file.name), kind, dataUrl } };
  } catch {
    return { ok: false, reason: 'read' };
  }
}
