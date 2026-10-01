export interface UploadOptions {
  folder?: string;
  publicId?: string;
}

export interface UploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
}

export interface StorageProvider {
  upload(buffer: Buffer, opts?: UploadOptions): Promise<UploadResult>;
  delete(publicId: string): Promise<void>;
  getUrl(publicId: string, transforms?: Record<string, unknown>): string;
}
