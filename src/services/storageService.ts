import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cuid from 'cuid';
import pool from '../db.js';

// Helper constants for file paths
const __filename = fileURLToPath(import.meta.url);
// Correctly navigate from dist/src/services/storageService.js to the backend root directory.
const backendRoot = path.join(path.dirname(__filename), '..', '..', '..');

// Use Render's persistent disk path if available, otherwise use a local `public` folder.
const uploadsBaseDir = process.env.RENDER ? '/var/data' : path.join(backendRoot, 'public');
const uploadsDir = path.join(uploadsBaseDir, 'uploads');


let settingsCache: Record<string, string> | null = null;
let cacheTimestamp = 0;

async function getSettings(): Promise<Record<string, string>> {
    const now = Date.now();
    // Cache settings for 1 minute to reduce DB queries
    if (settingsCache && (now - cacheTimestamp < 60000)) {
        return settingsCache;
    }

    const result = await pool.query('SELECT key, value FROM "Configuration"');
    settingsCache = result.rows.reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
    }, {});
    cacheTimestamp = now;
    return settingsCache!;
}


async function uploadToLocal(file: any): Promise<string> {
    const newFileName = `${cuid()}${path.extname(file.name)}`;
    const newPath = path.join(uploadsDir, newFileName);

    // Ensure the target directory exists.
    fs.mkdirSync(path.dirname(newPath), { recursive: true });
    
    // renameSync is faster as it's a metadata change on the same filesystem.
    // formidable puts files in a temp directory which should be on the same partition.
    fs.renameSync(file.path, newPath);
    
    // Always return a relative URL path. The frontend is responsible for creating the full URL.
    const publicPath = `/uploads/${newFileName}`;
    return publicPath;
}

async function uploadToS3(file: any, settings: Record<string, string>): Promise<string> {
    // This is a placeholder for the actual S3 upload logic.
    // To implement this, you would need to:
    // 1. `npm install @aws-sdk/client-s3`
    // 2. Uncomment and complete the logic below.
    console.log('Attempting to upload to S3 (implementation pending SDK).');
    
    /*
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({
        region: settings.s3_region,
        credentials: {
            accessKeyId: settings.s3_access_key_id,
            secretAccessKey: settings.s3_secret_access_key,
        },
    });

    const newFileName = `${cuid()}${path.extname(file.name)}`;
    const command = new PutObjectCommand({
        Bucket: settings.s3_bucket,
        Key: newFileName,
        Body: fs.createReadStream(file.path),
        ContentType: file.type,
    });

    await s3.send(command);
    return `https://${settings.s3_bucket}.s3.${settings.s3_region}.amazonaws.com/${newFileName}`;
    */

    throw new Error('S3 storage provider is selected, but the AWS SDK is not installed or the logic is not implemented. Please configure the backend.');
}

async function uploadToGCS(file: any, settings: Record<string, string>): Promise<string> {
    // This is a placeholder for the actual Google Cloud Storage upload logic.
    // To implement this, you would need to:
    // 1. `npm install @google-cloud/storage`
    // 2. Uncomment and complete the logic below.
     console.log('Attempting to upload to GCS (implementation pending SDK).');

    /*
    const { Storage } = require('@google-cloud/storage');
    const storage = new Storage({
        projectId: settings.gcs_project_id,
        credentials: JSON.parse(settings.gcs_credentials),
    });
    
    const bucket = storage.bucket(settings.gcs_bucket);
    const newFileName = `${cuid()}${path.extname(file.name)}`;
    
    await bucket.upload(file.path, {
        destination: newFileName,
        public: true, // Make the file publicly accessible
    });

    return `https://storage.googleapis.com/${settings.gcs_bucket}/${newFileName}`;
    */
   
    throw new Error('Google Cloud Storage provider is selected, but the GCS SDK is not installed or the logic is not implemented. Please configure the backend.');
}

export async function uploadFile(file: any): Promise<string> {
    const settings = await getSettings();
    switch (settings.storage_provider) {
        case 's3':
            return uploadToS3(file, settings);
        case 'gcs':
            return uploadToGCS(file, settings);
        case 'local':
        default:
            return uploadToLocal(file);
    }
}