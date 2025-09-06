// src/vendure-config.ts
import {
  VendureConfig,
  dummyPaymentHandler,
  DefaultJobQueuePlugin,
  DefaultSearchPlugin,
  AssetStorageStrategy,
  Logger,
  LanguageCode,
} from '@vendure/core';
import { AssetServerPlugin, SharpAssetPreviewStrategy } from '@vendure/asset-server-plugin';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
// FIX: Removed deprecated GraphiqlPlugin import. API playgrounds are now configured directly in apiOptions.
// import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import 'dotenv/config';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
const streamifier: any = require('streamifier');
import https from 'https';

/* ---------------- CloudinaryStorageStrategy ---------------- */

class CloudinaryStorageStrategy implements AssetStorageStrategy {
  private readonly folder = 'vendure-assets';

  constructor() {
    if (!process.env.CLOUDINARY_URL) {
      throw new Error('CLOUDINARY_URL environment variable must be set!');
    }
    cloudinary.config();
    Logger.info('Cloudinary Storage Strategy initialized.', 'CloudinaryPlugin');
  }

  writeFileFromStream(fileName: string, stream: Readable): Promise<string> {
    const public_id = path.parse(fileName).name;
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id,
          folder: this.folder,
          resource_type: 'auto',
        },
        (error: any, result: any) => {
          if (error) {
            Logger.error(`Cloudinary upload error: ${error.message}`, 'CloudinaryPlugin');
            return reject(error);
          }
          if (!result || !result.secure_url) {
            const msg = 'Cloudinary upload returned no secure_url';
            Logger.error(msg, 'CloudinaryPlugin');
            return reject(new Error(msg));
          }
          resolve(result.secure_url);
        },
      );
      stream.pipe(uploadStream);
    });
  }

  writeFileFromBuffer(fileName: string, data: Buffer): Promise<string> {
    return this.writeFileFromStream(fileName, streamifier.createReadStream(data));
  }

  private getResourceTypeFromIdentifier(identifier: string): 'image' | 'video' | 'raw' {
    try {
      const ext = path.extname(identifier).toLowerCase();
      const imageExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.ico'];
      const videoExt = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm', '.mkv'];
      if (imageExt.includes(ext)) return 'image';
      if (videoExt.includes(ext)) return 'video';
      return 'raw';
    } catch {
      return 'image';
    }
  }

  async fileExists(identifier: string): Promise<boolean> {
    const public_id = this.getPublicId(identifier);
    const resource_type = this.getResourceTypeFromIdentifier(identifier);
    try {
      await cloudinary.api.resource(public_id, { resource_type });
      return true;
    } catch (err: any) {
      if (err?.http_code === 404 || err?.error?.http_code === 404) return false;
      throw err;
    }
  }

  async deleteFile(identifier: string): Promise<void> {
    const public_id = this.getPublicId(identifier);
    const resource_type = this.getResourceTypeFromIdentifier(identifier);
    await cloudinary.uploader.destroy(public_id, { resource_type });
  }

  private getPublicId(identifier: string): string {
    try {
      if (identifier.includes('res.cloudinary.com')) {
        const regex = /\/upload\/(?:v\d+\/)?(.+)/;
        const match = identifier.match(regex);
        if (match && match[1]) {
          const parsed = path.parse(match[1]);
          return path.join(parsed.dir, parsed.name);
        }
      }
      const parsed = path.parse(identifier);
      return `${this.folder}/${parsed.name}`;
    } catch {
      const parsed = path.parse(identifier);
      return path.join(parsed.dir, parsed.name);
    }
  }

  readFileToBuffer(identifier: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      https.get(identifier, (res) => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        const chunks: Buffer[] = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    });
  }

  readFileToStream(identifier: string): Promise<Readable> {
    return new Promise((resolve, reject) => {
      https.get(identifier, (res) => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        resolve(res);
      }).on('error', reject);
    });
  }

  toAbsoluteUrl(_req: any, identifier: string): string {
    return identifier;
  }
}

/* ---------------- Vendure config ---------------- */

const serverPort = +process.env.PORT || 3000;
const IS_DEV = process.env.APP_ENV === 'dev';

/* ---------------- EmailPlugin: transport selection ----------------
   If SMTP env vars provided -> use SMTP transport.
   Else -> fallback to file transport (safe, won't crash), in dev include devMode:true and mailbox route.
-----------------------------------------------------------------*/

const commonEmailOptions = {
  handlers: defaultEmailHandlers,
  templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
  globalTemplateVars: {
    fromAddress: '"example" <noreply@example.com>',
    verifyEmailAddressUrl: 'http://localhost:8080/verify',
    passwordResetUrl: 'http://localhost:8080/password-reset',
    changeEmailAddressUrl: 'http://localhost:8080/verify-email-address-change',
  },
};

let emailPlugin: ReturnType<typeof EmailPlugin.init>;

if (process.env.SMTP_HOST) {
  // SMTP transport configured via env
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const smtpTransport = {
    type: 'smtp' as const,
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  };

  emailPlugin = EmailPlugin.init({
    ...commonEmailOptions,
    transport: smtpTransport as any,
  } as any);
} else {
  // Fallback to file transport so plugin never crashes if SMTP is not set.
  const fileTransport = {
    type: 'file' as const,
    outputPath: path.join(__dirname, '../static/email/test-emails'),
  };

  // For dev, include devMode:true and mailbox route; for prod keep those keys out (not required)
  const devPart = IS_DEV ? { devMode: true as true, route: 'mailbox' } : {};
  emailPlugin = EmailPlugin.init({
    ...commonEmailOptions,
    transport: fileTransport as any,
    ...devPart,
  } as any);
}

/* ---------------- Final Vendure config ---------------- */

export const config: VendureConfig = {
  apiOptions: {
    port: serverPort,
    hostname: IS_DEV ? 'localhost' : '0.0.0.0',
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',
    trustProxy: true,
    cors: {
      origin: ['https://taxaai.onrender.com', 'http://localhost:5173'],
      credentials: true,
    },
    ...(IS_DEV ? { adminApiDebug: true as true, shopApiDebug: true as true } : {}),
    // FIX: Replaced deprecated GraphiqlPlugin with built-in API playground options.
    adminApiPlayground: IS_DEV,
    shopApiPlayground: IS_DEV,
  },

  defaultLanguageCode: LanguageCode.uk,

  authOptions: {
    tokenMethod: ['bearer', 'cookie'] as const,
    superadminCredentials: {
      identifier: process.env.SUPERADMIN_USERNAME || 'superadmin',
      password: process.env.SUPERADMIN_PASSWORD || 'superadmin',
    },
    cookieOptions: { secret: process.env.COOKIE_SECRET || 'cookie-secret' },
  },

  dbConnectionOptions: {
    type: 'postgres',
    synchronize: false,
    migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
    logging: false,
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    extra: { connectionTimeoutMillis: 10000 },
  },

  paymentOptions: { paymentMethodHandlers: [dummyPaymentHandler] },

  customFields: {},

  plugins: [
    AssetServerPlugin.init({
      route: 'assets',
      assetUploadDir: path.join(__dirname, '../static/assets'),
      storageStrategyFactory: () => new CloudinaryStorageStrategy(),
      previewStrategy: new SharpAssetPreviewStrategy({ maxWidth: 400, maxHeight: 400 }),
    }),

    // FIX: Removed deprecated GraphiqlPlugin. API playgrounds are now configured via `apiOptions`.
    // GraphiqlPlugin.init({
    //   adminApiPath: 'admin-api',
    //   shopApiPath: 'shop-api',
    //   route: 'graphiql',
    //   apiPlayground: {
    //     admin: true,
    //     shop: true,
    //   },
    // }),

    DefaultJobQueuePlugin.init({}),
    DefaultSearchPlugin.init({ indexStockStatus: true }),

    // Insert configured email plugin
    emailPlugin,

    AdminUiPlugin.init({
      route: 'admin',
      port: serverPort,
      adminUiConfig: {
        apiHost: IS_DEV ? 'http://localhost' : 'https://taxa-backend.onrender.com',
        apiPort: IS_DEV ? serverPort : undefined,
        availableLanguages: [LanguageCode.uk, LanguageCode.en, LanguageCode.ru],
      },
    }),
  ],
};
