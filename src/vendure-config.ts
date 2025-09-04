import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSchedulerPlugin,
    DefaultSearchPlugin,
    VendureConfig,
    AssetStorageStrategy,
    Logger,
    LanguageCode,
    // FIX: In Vendure 2+, i18n settings are configured via a plugin.
    DefaultI18nPlugin,
} from '@vendure/core';
// FIX: In Vendure 2+, SharpAssetPreviewStrategy was moved to the @vendure/asset-server-plugin package.
import { SharpAssetPreviewStrategy } from '@vendure/asset-server-plugin';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import 'dotenv/config';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
const streamifier = require('streamifier'); // FIX: Use require to avoid TS type error for modules without declarations.
import { Readable } from 'stream';
import https from 'https';


// --- Custom Cloudinary Storage Strategy ---
// This strategy handles uploading, deleting, and resolving URLs for assets using Cloudinary.

// FIX: Updated class to implement the modern AssetStorageStrategy interface.
class CloudinaryStorageStrategy implements AssetStorageStrategy {
    private readonly folder = 'vendure-assets';

    constructor() {
        // Automatically configure Cloudinary from the CLOUDINARY_URL environment variable
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
                (error, result) => {
                    if (error) {
                        Logger.error(`Failed to upload to Cloudinary: ${error.message}`, 'CloudinaryPlugin');
                        return reject(error);
                    }
                    if (!result) {
                        const msg = `Cloudinary upload returned no result.`;
                        Logger.error(msg, 'CloudinaryPlugin');
                        return reject(new Error(msg));
                    }
                    // Return the secure URL provided by Cloudinary
                    resolve(result.secure_url);
                },
            );
            stream.pipe(uploadStream);
        });
    }

    writeFileFromBuffer(fileName: string, data: Buffer): Promise<string> {
        return this.writeFileFromStream(fileName, streamifier.createReadStream(data));
    }

    // FIX: Added helper to determine resource type from URL extension.
    // Cloudinary's admin/destroy APIs do not support 'auto' resource_type.
    private getResourceTypeFromIdentifier(identifier: string): 'image' | 'video' | 'raw' {
        try {
            // This simple extension check works for both full URLs and plain filenames.
            const extension = path.extname(identifier).toLowerCase();
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.ico'];
            const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm', '.mkv'];

            if (imageExtensions.includes(extension)) {
                return 'image';
            }
            if (videoExtensions.includes(extension)) {
                return 'video';
            }
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
            // FIX: Correctly handle Cloudinary's 404 error structure.
            // A "not found" error is the expected outcome for a new file.
            if (error.http_code === 404 || error.error?.http_code === 404) {
                Logger.info(`File with public_id '${public_id}' does not exist (this is normal for new uploads).`, 'CloudinaryPlugin');
                return false;
            }
            Logger.error(`Error checking if file exists in Cloudinary: ${JSON.stringify(error, null, 2)}`, 'CloudinaryPlugin');
            // Re-throw other, unexpected errors
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

    // FIX: This robust method handles both full URLs (from existing assets)
    // and simple filenames (from new uploads).
    private getPublicId(identifier: string): string {
        try {
            // Check if it's a full Cloudinary URL
            if (identifier.includes('res.cloudinary.com')) {
                // Regex to capture the path after /upload/ and an optional version segment /v12345/
                const regex = /\/upload\/(?:v\d+\/)?(.+)/;
                const match = identifier.match(regex);
                if (match && match[1]) {
                    const fullPathWithExt = match[1];
                    const parsed = path.parse(fullPathWithExt);
                    // Returns 'folder/filename' which is the full public_id
                    return path.join(parsed.dir, parsed.name); 
                }
            }
            
            // If not a URL, assume it's a filename from a new upload (e.g., 'my-image.jpg')
            // We must construct the full public_id including the folder.
            const parsedFilename = path.parse(identifier);
            return `${this.folder}/${parsedFilename.name}`;

        } catch (e: any) {
             Logger.error(`Could not parse public_id from identifier: ${identifier}. Error: ${e.message}`, 'CloudinaryPlugin');
             // Fallback: return the identifier without extension
             const parsed = path.parse(identifier);
             return path.join(parsed.dir, parsed.name);
        }
    }

    readFileToBuffer(identifier: string): Promise<Buffer> {
        // Vendure calls this method to generate asset previews.
        // We need to download the file from Cloudinary and return its data as a Buffer.
        return new Promise((resolve, reject) => {
            https.get(identifier, response => {
                if (response.statusCode !== 200) {
                    const error = new Error(`Failed to download file from ${identifier}: ${response.statusCode}`);
                    Logger.error(error.message, 'CloudinaryPlugin');
                    return reject(error);
                }
                const chunks: Buffer[] = [];
                response.on('data', chunk => chunks.push(chunk));
                response.on('end', () => resolve(Buffer.concat(chunks)));
            }).on('error', err => {
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
            }).on('error', err => {
                Logger.error(`Error streaming file from Cloudinary: ${err.message}`, 'CloudinaryPlugin');
                reject(err);
            });
        });
    }
    
    // Vendure uses this method to create the final URL. Since writeFile already returns a full URL,
    // we just return it directly.
    toAbsoluteUrl(request: any, identifier: string): string {
        return identifier;
    }
}


const IS_DEV = process.env.APP_ENV === 'dev';
const serverPort = +process.env.PORT || 3000;

export const config: VendureConfig = {
    apiOptions: {
        port: serverPort,
        // For Render, bind to 0.0.0.0
        hostname: IS_DEV ? 'localhost' : '0.0.0.0',
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        // Important for Render's proxy
        trustProxy: true,
        // Add explicit CORS configuration for production deployment
        cors: {
            origin: ['https://taxa-5ky4.onrender.com', 'http://localhost:5173'],
            credentials: true,
        },
        ...(IS_DEV ? {
            adminApiDebug: true,
            shopApiDebug: true,
        } : {}),
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
          secret: process.env.COOKIE_SECRET,
        },
    },
    dbConnectionOptions: {
        type: 'postgres',
        synchronize: false,
        migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
        logging: false,
        url: process.env.DATABASE_URL,
        // Required for Render's managed PostgreSQL
        ssl: {
            rejectUnauthorized: false,
        },
        // FIX: Add a longer timeout for database connections
        // This helps in environments like Render where initial connections can be slow.
        extra: {
            connectionTimeoutMillis: 10000,
        },
    },
    paymentOptions: {
        paymentMethodHandlers: [dummyPaymentHandler],
    },
    assetOptions: {
        assetStorageStrategy: new CloudinaryStorageStrategy(),
        assetPreviewStrategy: new SharpAssetPreviewStrategy({
            maxWidth: 400,
            maxHeight: 400,
        }),
    },
    customFields: {},
    plugins: [
        // FIX: In Vendure 2+, i18n settings were moved into a plugin.
        DefaultI18nPlugin.init({
            defaultLanguageCode: LanguageCode.uk,
            availableLanguages: [LanguageCode.uk, LanguageCode.en, LanguageCode.ru],
        }),
        GraphiqlPlugin.init(),
        // FIX: Removed the AssetServerPlugin as it conflicts with the CloudinaryStorageStrategy.
        // The Cloudinary strategy handles serving assets from its own CDN URLs.
        DefaultSchedulerPlugin.init(),
        DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
        DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
        EmailPlugin.init({
            devMode: true,
            outputPath: path.join(__dirname, '../static/email/test-emails'),
            route: 'mailbox',
            handlers: defaultEmailHandlers,
            templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
            globalTemplateVars: {
                fromAddress: '"example" <noreply@example.com>',
                verifyEmailAddressUrl: 'http://localhost:8080/verify',
                passwordResetUrl: 'http://localhost:8080/password-reset',
                changeEmailAddressUrl: 'http://localhost:8080/verify-email-address-change'
            },
        }),
        AdminUiPlugin.init({
            route: 'admin',
            // The port setting is for local development and can be ignored by Render.
            port: 3002, 
            // FIX: This is the crucial part. We provide the public URL
            // for the Admin UI to connect to the API in production.
            adminUiConfig: {
                // FIX: The correct property name for the Admin UI API URL is 'apiHost', not 'apiUrl'.
                apiHost: IS_DEV ? undefined : 'https://taxa-backend.onrender.com',
            },
        }),
    ],
};