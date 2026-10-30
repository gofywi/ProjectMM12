import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { getAuth } from '@react-native-firebase/auth';


export const MODEL_URL = 'AddKeyHere';

export const MODEL_FILE_NAME = 'model.gguf';

// Same location used by LlamaService.
export const MODEL_PATH = `${RNFS.DocumentDirectoryPath}/${MODEL_FILE_NAME}`;
const TEMP_PATH = `${MODEL_PATH}.part`;

const MIN_VALID_BYTES = 50 * 1024 * 1024;
const GGUF_MAGIC_B64 = 'R0dVRg==';

export type ModelState = 'ready' | 'missing';

class ModelDownloadService {
  private jobId: number | null = null;

  private async isValid(path: string, expectedSize?: number): Promise<boolean> {
    try {
      if (!(await RNFS.exists(path))) return false;
      const stat = await RNFS.stat(path);
      const size = Number(stat.size);
      if (size < MIN_VALID_BYTES) return false;
      if (expectedSize && expectedSize > 0 && size !== expectedSize) return false;
      const head = await RNFS.read(path, 4, 0, 'base64');
      return head === GGUF_MAGIC_B64;
    } catch {
      return false;
    }
  }

  async check(): Promise<ModelState> {
    if (await this.isValid(MODEL_PATH)) return 'ready';

    // Existing development build behavior is preserved.
    if (Platform.OS === 'android') {
      try {
        if (await RNFS.existsAssets(MODEL_FILE_NAME)) {
          await RNFS.copyFileAssets(MODEL_FILE_NAME, MODEL_PATH);
          if (await this.isValid(MODEL_PATH)) return 'ready';
        }
      } catch {
        // No bundled model (Play Store build) -> download.
      }
    }
    return 'missing';
  }

  async download(onProgress: (percent: number) => void): Promise<void> {
    const user = getAuth().currentUser;
    if (!user) {
      throw new Error('Please sign in to download the AI model.');
    }

    // Always obtain a fresh Firebase ID token rather than using a token cached
    // in AsyncStorage, which may have expired.
    const firebaseToken = await user.getIdToken();

    if (MODEL_URL.includes('YOUR-ACTUAL-WORKER')) {
      throw new Error('Configure MODEL_URL with the deployed Cloudflare Worker URL.');
    }

    await RNFS.unlink(TEMP_PATH).catch(() => {});
    if (await RNFS.exists(MODEL_PATH)) await RNFS.unlink(MODEL_PATH);

    let expected = 0;
    const job = RNFS.downloadFile({
      fromUrl: MODEL_URL,
      toFile: TEMP_PATH,
      headers: {
        Authorization: `Bearer ${firebaseToken}`,
      },
      background: true,
      discretionary: false,
      progressInterval: 400,
      progressDivider: 1,
      begin: res => {
        expected = Number(res.contentLength) || 0;
      },
      progress: res => {
        const total = res.contentLength || expected;
        if (total > 0) {
          onProgress(Math.min(99, Math.floor((res.bytesWritten / total) * 100)));
        }
      },
    });
    this.jobId = job.jobId;

    let result;
    try {
      result = await job.promise;
    } finally {
      this.jobId = null;
    }

    if (result.statusCode !== 200) {
      await RNFS.unlink(TEMP_PATH).catch(() => {});
      if (result.statusCode === 401 || result.statusCode === 403) {
        throw new Error('Model download access denied. Please sign in again.');
      }
      throw new Error(`Download failed (HTTP ${result.statusCode}).`);
    }

    if (!(await this.isValid(TEMP_PATH, expected))) {
      await RNFS.unlink(TEMP_PATH).catch(() => {});
      throw new Error('Downloaded model is corrupted. Please try again.');
    }

    await RNFS.moveFile(TEMP_PATH, MODEL_PATH);
    onProgress(100);
  }

  async verify(): Promise<boolean> {
    return this.isValid(MODEL_PATH);
  }

  cancel() {
    if (this.jobId !== null) {
      RNFS.stopDownload(this.jobId);
      this.jobId = null;
    }
  }
}

export default new ModelDownloadService();