// Robust video file acceptance — many real-world containers have inconsistent MIME between browsers.
// .mkv reports as video/x-matroska on some browsers, video/matroska on others, and "" on Windows Edge.
// Fall back to extension when MIME is missing/inconsistent.

export const ACCEPTED_VIDEO_MIMES = new Set<string>([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/matroska',
  'video/mpeg',
  'video/ogg',
]);

export const ACCEPTED_VIDEO_EXTENSIONS = new Set<string>([
  'mp4', 'webm', 'mov', 'avi', 'mkv', 'mpeg', 'mpg', 'ogv', 'ogg', 'm4v',
]);

export const VIDEO_ACCEPT_ATTR =
  'video/*,video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,video/matroska,video/mpeg,video/ogg,.mp4,.webm,.mov,.avi,.mkv,.mpeg';

export const IMAGE_VIDEO_ACCEPT_ATTR = `image/*,${VIDEO_ACCEPT_ATTR}`;

export function getFileExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i + 1).toLowerCase();
}

export function isAcceptedVideo(file: File): boolean {
  const mime = (file.type || '').toLowerCase();
  if (mime.startsWith('video/')) return true; // permissive — browser said it's video
  if (ACCEPTED_VIDEO_MIMES.has(mime)) return true;
  const ext = getFileExt(file.name);
  return ACCEPTED_VIDEO_EXTENSIONS.has(ext);
}

export function isAcceptedImage(file: File): boolean {
  const mime = (file.type || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  const ext = getFileExt(file.name);
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif', 'heic'].includes(ext);
}

export function isAcceptedMedia(file: File): boolean {
  return isAcceptedImage(file) || isAcceptedVideo(file);
}

/** Effective content-type for upload — synthesize one if browser provided nothing. */
export function effectiveContentType(file: File): string {
  if (file.type) return file.type;
  const ext = getFileExt(file.name);
  const map: Record<string, string> = {
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
    avi: 'video/x-msvideo', mkv: 'video/x-matroska', mpeg: 'video/mpeg',
    mpg: 'video/mpeg', ogv: 'video/ogg', ogg: 'video/ogg', m4v: 'video/mp4',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif',
  };
  return map[ext] || 'application/octet-stream';
}

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB (bucket limit)
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
