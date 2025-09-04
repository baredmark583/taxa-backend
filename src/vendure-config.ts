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
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import 'dotenv/config';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
const streamifier: any = require('streamifier');
import https from 'https';

/**
 * CloudinaryStorageStrategy
 * Реализует AssetStorageStrategy для загрузки/удаления/чтения ассетов в Cloudinary.
 * Возвращает в writeFile... абсолютный URL (secure_url).
 */
class CloudinaryStorageStrategy implements AssetStorageStrategy {
  private readonly folder = 'vendure-assets';

  constructor() {
    if (!process.env.CLOUDINARY_URL) {
      throw new Error('CLOUDINARY_URL environment variable must be set!');
    }
    // Автоматическая конфигурация из CLOUDINARY_URL
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
            Logger.error(`Failed to upload to Cloudinary: ${error.message}`, 'CloudinaryPlugin');
            return reject(error);
          }
          if (!result || !result.secure_url) {
            const msg = `Cloudinary upload returned no result or missing secure_url.`;
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
      const extension = path.extname(identifier).toLowerCase();
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.ico'];
      const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm', '.mkv'];

      if (imageExtensions.includes(extension)) return 'image';
      if (videoExtensions.includes(extension)) return 'video';
      return 'raw';
    } catch (e) {
      Logger.warn(`Could not determine resource type from identifier: ${identifier}. Defaulting to 'image'.`, 'CloudinaryPlugin');
      return 'image';
    }
  }

  async fileExists(identifier: string): Promise<boolean> {
    const public_id = this.getPublicId(identifier);
    const resource_type = this.getResourceTypeFromIdentifier(identifier);
    try {
      await cloudinary.api.resource(public_id, { resource_type });
      return true;
    } catch (error: any) {
      if (error?.http_code === 404 || error?.error?.http_code === 404) {
        Logger.info(`File with public_id '${public_id}' does not exist (normal for new uploads).`, 'CloudinaryPlugin');
        return false;
      }
      Logger.error(`Error checking if file exists in Cloudinary: ${JSON.stringify(error, null, 2)}`, 'CloudinaryPlugin');
      throw error;
    }
  }

  async deleteFile(identifier: string): Promise<void> {
    const public_id = this.getPublicId(identifier);
    const resource_type = this.getResourceTypeFromIdentifier(identifier);
    try {
      await cloudinary.uploader.destroy(public_id, { resource_type });
    } catch (error: any) {
      Logger.error(`Error deleting file from Cloudinary: ${error.message}`, 'CloudinaryPlugin');
      throw error;
    }
  }

  private getPublicId(identifier: string): string {
    try {
      // Если это полный Cloudinary URL, парсим public_id
      if (identifier.includes('res.cloudinary.com')) {
        const regex = /\/upload\/(?:v\d+\/)?(.+)/;
        const match = identifier.match(regex);
        if (match && match[1]) {
          const fullPathWithExt = match[1];
          const parsed = path.parse(fullPathWithExt);
          // Возвращаем 'folder/filename' (без расширения)
          return path.join(parsed.dir, parsed.name);
        }
      }
      // Иначе — имя файла, добавляем папку
      const parsedFilename = path.parse(identifier);
      return `${this.folder}/${parsedFilename.name}`;
    } catch (e: any) {
      Logger.error(`Could not parse public_id from identifier: ${identifier}. Error: ${e?.message}`, 'CloudinaryPlugin');
      const parsed = path.parse(identifier);
      return path.join(parsed.dir, parsed.name);
    }
  }

  readFileToBuffer(identifier: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      https.get(identifier, (response) => {
        if (response.statusCode !== 200) {
          const error = new Error(`Failed to download file from ${identifier}: ${response.statusCode}`);
          Logger.error(error.message, 'CloudinaryPlugin');
          return reject(error);
        }
        const chunks: Buffer[] = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', (err) => {
        Logger.error(`Error downloading file from Cloudinary: ${err.message}`, 'CloudinaryPlugin');
        reject(err);
      });
    });
  }

  readFileToStream(identifier: string): Promise<Readable> {
    return new Promise((resolve, reject) => {
      https.get(identifier, response => {
        if (response.statusCode !== 200) {
          const error = new Error(`Failed to stream file from ${identifier}: ${response.statusCode}`);
          Logger.error(error.message, 'CloudinaryPlugin');
          return reject(error);
        }
        resolve(response);
      }).on('error', (err) => {
        Logger.error(`Error streaming file from Cloudinary: ${err.message}`, 'CloudinaryPlugin');
        reject(err);
      });
    });
  }

  toAbsoluteUrl(_request: any, identifier: string): string {
    // writeFile возвращает уже полный URL (secure_url), так что возвращаем напрямую.
    return identifier;
  }
}

/* -------------------- Конфигурация Vendure -------------------- */

const serverPort = +process.env.PORT || 3000;
const IS_DEV = process.env.APP_ENV === 'dev';

export const config: VendureConfig = {
  apiOptions: {
    port: serverPort,
    hostname: IS_DEV ? 'localhost' : '0.0.0.0',
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',
    // Для Render важно доверять прокси. Устанавливаем в true для продакшена.
    trustProxy: !IS_DEV,
    cors: {
      origin: ['https://taxa-5ky4.onrender.com', 'http://localhost:5173'],
      // Применяем 'as const' для решения проблемы с выводом типов TypeScript,
      // так как компилятор ожидает литеральный тип `true`.
      credentials: true,
    },
    // Устанавливаем флаги отладки напрямую, без spread, для большей ясности
    adminApiDebug: IS_DEV,
    shopApiDebug: IS_DEV,
  },

  // Язык по умолчанию
  defaultLanguageCode: LanguageCode.uk,

  authOptions: {
    // Важно: as const, чтобы соответствовать строгому типу
    tokenMethod: ['bearer', 'cookie'] as const,
    superadminCredentials: {
      identifier: process.env.SUPERADMIN_USERNAME || 'superadmin',
      password: process.env.SUPERADMIN_PASSWORD || 'superadmin',
    },
    cookieOptions: {
      secret: process.env.COOKIE_SECRET || 'cookie-secret-placeholder',
    },
  },

  dbConnectionOptions: {
    type: 'postgres',
    synchronize: false,
    migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
    logging: false,
    url: process.env.DATABASE_URL,
    ssl: {
      // Для Render managed Postgres
      rejectUnauthorized: false,
    },
    extra: {
      connectionTimeoutMillis: 10000,
    },
  },

  paymentOptions: {
    paymentMethodHandlers: [dummyPaymentHandler],
  },

  customFields: {},

  plugins: [
    // AssetServerPlugin: assetUploadDir обязателен в типах
    AssetServerPlugin.init({
      route: 'assets',
      assetUploadDir: path.join(__dirname, '../static/assets'),
      storageStrategyFactory: () => new CloudinaryStorageStrategy(),
      previewStrategy: new SharpAssetPreviewStrategy({
        maxWidth: 400,
        maxHeight: 400,
      }),
    }),

    GraphiqlPlugin.init({
      route: 'graphiql',
    }),

    DefaultJobQueuePlugin.init({}),

    DefaultSearchPlugin.init({
      // опция примерная — оставить true/false по желанию (соответствует типам)
      indexStockStatus: true,
    }),

    EmailPlugin.init({
      // Dev mode сохраняет письма в файл; в продакшне можно настроить SMTP/transport.
      devMode: IS_DEV,
      outputPath: path.join(__dirname, '../static/email/test-emails'),
      route: 'mailbox',
      handlers: defaultEmailHandlers,
      templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
      globalTemplateVars: {
        fromAddress: '"example" <noreply@example.com>',
        verifyEmailAddressUrl: 'http://localhost:8080/verify',
        passwordResetUrl: 'http://localhost:8080/password-reset',
        changeEmailAddressUrl: 'http://localhost:8080/verify-email-address-change',
      },
    }),

    AdminUiPlugin.init({
      route: 'admin',
      // Обязательно: порт. Для простоты используем один порт сервера.
      port: serverPort,
      adminUiConfig: {
        apiHost: IS_DEV ? 'http://localhost' : 'https://taxa-backend.onrender.com',
        apiPort: IS_DEV ? serverPort : undefined,
        availableLanguages: [LanguageCode.uk, LanguageCode.en, LanguageCode.ru],
      },
    }),
  ],
};