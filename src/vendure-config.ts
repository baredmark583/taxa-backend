


import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSearchPlugin,
    VendureConfig,
    AssetStorageStrategy,
    Logger,
    LanguageCode,
} from '@vendure/core';
// In Vendure v2, SharpAssetPreviewStrategy is in the asset-server-plugin.
import { AssetServerPlugin, SharpAssetPreviewStrategy } from '@vendure/asset-server-plugin';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import 'dotenv/config';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
const streamifier = require('streamifier');
import { Readable } from 'stream';
import https from 'https';


const serverPort = +process.env.PORT || 3000;
const IS_DEV = process.env.APP_ENV === 'dev';

export const config = {
  apiOptions: {
    port: serverPort,
    hostname: IS_DEV ? 'localhost' : '0.0.0.0',
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',
    trustProxy: true,
    cors: { origin: ['https://taxa-5ky4.onrender.com', 'http://localhost:5173'], credentials: true },
    ...(IS_DEV ? { adminApiDebug: true, shopApiDebug: true } : {}),
  },
  defaultLanguageCode: LanguageCode.uk,
  authOptions: {
    tokenMethod: ['bearer', 'cookie'],
    superadminCredentials: {
      identifier: process.env.SUPERADMIN_USERNAME,
      password: process.env.SUPERADMIN_PASSWORD,
    },
    cookieOptions: { secret: process.env.COOKIE_SECRET },
  },
  dbConnectionOptions: {
    type: 'postgres',
    synchronize: false,
    migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    extra: { connectionTimeoutMillis: 10000 },
  },
  paymentOptions: { paymentMethodHandlers: [dummyPaymentHandler] },
  customFields: {},
  plugins: [
    AssetServerPlugin.init({
      route: 'assets',
      storageStrategyFactory: () => new CloudinaryStorageStrategy(),
      previewStrategy: new SharpAssetPreviewStrategy({ maxWidth: 400, maxHeight: 400 }),
    }),
    GraphiqlPlugin.init({ route: 'graphiql' }),
    DefaultJobQueuePlugin.init({}),
    DefaultSearchPlugin.init({ indexStockStatus: true }),
    EmailPlugin.init({ /* ... */ }),
    AdminUiPlugin.init({
      route: 'admin',
      port: serverPort,
      adminUiConfig: {
        apiHost: IS_DEV ? 'http://localhost' : 'https://taxa-backend.onrender.com',
        apiPort: IS_DEV ? serverPort : undefined,
        availableLanguages: [LanguageCode.uk, LanguageCode.en, LanguageCode.ru],
      }
    }),
  ],
};
