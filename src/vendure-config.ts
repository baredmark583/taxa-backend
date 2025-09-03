import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSchedulerPlugin,
    DefaultSearchPlugin,
    VendureConfig,
    AssetStorageStrategy,
    Logger,
} from '@vendure/core';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import 'dotenv/config';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
const streamifier = require('streamifier'); // FIX: Use require to avoid TS type error for modules without declarations.
import { Readable } from 'stream';


// --- Custom Cloudinary Storage Strategy ---
// This strategy handles uploading, deleting, and resolving URLs for assets using Cloudinary.

// FIX: Updated class to implement the modern AssetStorageStrategy interface.
class CloudinaryStorageStrategy implements AssetStorageStrategy {
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
                    folder: 'vendure-assets', // Optional: organize assets in a folder
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

    async fileExists(identifier: string): Promise<boolean> {
        // The identifier is the full URL, we need to extract the public_id
        const public_id = this.getPublicIdFromUrl(identifier);
        try {
            // Use `resource` for any resource type, or specify for better performance if known.
            await cloudinary.api.resource(public_id, { resource_type: 'auto' });
            return true;
        } catch (error: any) {
            // A "not found" error means the file doesn't exist
            if (error.http_code === 404) {
                return false;
            }
            Logger.error(`Error checking if file exists in Cloudinary: ${error.message}`, 'CloudinaryPlugin');
            // Re-throw other errors
            throw error;
        }
    }

    async deleteFile(identifier: string): Promise<void> {
        const public_id = this.getPublicIdFromUrl(identifier);
        try {
            await cloudinary.uploader.destroy(public_id, { resource_type: 'auto' });
        } catch (error: any) {
            Logger.error(`Error deleting file from Cloudinary: ${error.message}`, 'CloudinaryPlugin');
            throw error;
        }
    }

    readFileToBuffer(identifier: string): Promise<Buffer> {
        throw new Error('CloudinaryStorageStrategy.readFileToBuffer() is not implemented.');
    }

    readFileToStream(identifier: string): Promise<Readable> {
        throw new Error('CloudinaryStorageStrategy.readFileToStream() is not implemented.');
    }
    
    // Vendure uses this method to create the final URL. Since writeFile already returns a full URL,
    // we just return it directly.
    toAbsoluteUrl(request: any, identifier: string): string {
        return identifier;
    }

    private getPublicIdFromUrl(url: string): string {
        try {
            const parsedUrl = new URL(url);
            // Example path: /v1234567/vendure-assets/some-asset.jpg
            const pathSegments = parsedUrl.pathname.split('/');
            // Remove the version, folder, and get the filename without extension
            const fileNameWithExt = pathSegments.slice(3).join('/');
            return path.parse(fileNameWithExt).name;
        } catch (e) {
             Logger.error(`Could not parse public_id from URL: ${url}`, 'CloudinaryPlugin');
             // As a fallback, try to extract from a simple file path
             return path.parse(url).name;
        }
    }
}


const IS_DEV = process.env.APP_ENV === 'dev';
const serverPort = +process.env.PORT || 3000;

export const config: VendureConfig = {
    apiOptions: {
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        trustProxy: IS_DEV ? false : 1,
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
        ssl: {
            rejectUnauthorized: false,
        },
    },
    paymentOptions: {
        paymentMethodHandlers: [dummyPaymentHandler],
    },
    // FIX: Moved asset storage configuration to the top-level `assetOptions`.
    assetOptions: {
        assetStorageStrategy: new CloudinaryStorageStrategy(),
    },
    customFields: {},
    plugins: [
        GraphiqlPlugin.init(),
        // Configure the AssetServerPlugin. The storage strategy is now defined globally.
        AssetServerPlugin.init({
            route: 'assets',
            // FIX: Provide a directory for temporary asset storage, which is required by the plugin.
            assetUploadDir: path.join(__dirname, '../static/assets'),
        }),
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
            port: serverPort + 2,
            adminUiConfig: {
                apiPort: serverPort,
            },
        }),
    ],
};