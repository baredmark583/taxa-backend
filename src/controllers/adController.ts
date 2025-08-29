

// FIX: Switched to default express import and qualified types (express.Request, express.Response) to resolve property access errors from potential type conflicts.
import express from 'express';
// FIX: Added 'multer' import to make Express.Multer.File type available.
import 'multer';
import { query } from '../db.js';
import cuid from 'cuid';
import { type Ad, type AdStatus } from '../types.js';
import { type AuthRequest } from '../middleware/auth.js';
import { log } from '../utils/logger.js';

// Get all ads
// FIX: Use qualified express types to resolve type conflicts.
export const getAllAds = async (req: express.Request, res: express.Response) => {
    const CONTEXT = 'adController:getAllAds';
    log.info(CONTEXT, 'Attempting to fetch all ads', { query: req.query });

    const { search, category, sortBy, sellerId } = req.query;

    let queryString = `
        SELECT a.*,
               json_build_object(
                   'id', u.id,
                   'name', u.name,
                   'avatarUrl', u."avatarUrl"
               ) as seller
        FROM "Ad" as a
        JOIN "User" as u ON a."sellerId" = u.id
    `;
    const params: (string | number)[] = [];
    const whereClauses: string[] = [];

    if (search && typeof search === 'string') {
        params.push(`%${search.toLowerCase()}%`);
        whereClauses.push(`(LOWER(a.title) LIKE $${params.length} OR LOWER(a.description) LIKE $${params.length})`);
    }

    if (category && typeof category === 'string' && category !== 'Все') {
        params.push(category);
        whereClauses.push(`a.category = $${params.length}`);
    }

    if (sellerId && typeof sellerId === 'string') {
        params.push(sellerId);
        whereClauses.push(`a."sellerId" = $${params.length}`);
    }

    if (whereClauses.length > 0) {
        queryString += ' WHERE ' + whereClauses.join(' AND ');
    }

    let orderByClause = 'ORDER BY a."isBoosted" DESC';
    if (sortBy === 'price_asc') {
        orderByClause += ', a.price::NUMERIC ASC';
    } else if (sortBy === 'price_desc') {
        orderByClause += ', a.price::NUMERIC DESC';
    } else {
        orderByClause += ', a."createdAt" DESC';
    }
    queryString += ` ${orderByClause}`;

    try {
        const result = await query(queryString, params);
        log.info(CONTEXT, `Successfully fetched ${result.rows.length} ads.`);
        res.status(200).json(result.rows);
    } catch (error) {
        log.error(CONTEXT, 'Failed to fetch ads.', error);
        res.status(500).json({ message: 'Failed to fetch ads' });
    }
};

// Get a single ad by ID
// FIX: Use qualified express types to resolve type conflicts.
export const getAdById = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const CONTEXT = `adController:getAdById(${id})`;
    log.info(CONTEXT, 'Attempting to fetch a single ad.');

    try {
        const result = await query(`
            SELECT a.*,
                   json_build_object(
                       'id', u.id,
                       'name', u.name,
                       'avatarUrl', u."avatarUrl"
                   ) as seller
            FROM "Ad" as a
            JOIN "User" as u ON a."sellerId" = u.id
            WHERE a.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            log.info(CONTEXT, 'Ad not found.');
            return res.status(404).json({ message: 'Ad not found' });
        }
        log.info(CONTEXT, 'Successfully fetched ad.');
        res.status(200).json(result.rows[0]);
    } catch (error) {
        log.error(CONTEXT, 'Failed to fetch ad.', error);
        res.status(500).json({ message: 'Failed to fetch ad' });
    }
};

// Create a new ad
// FIX: Use qualified express types to resolve type conflicts.
export const createAd = async (req: AuthRequest, res: express.Response) => {
    const CONTEXT = 'adController:createAd';
    const sellerId = req.user?.id;
    log.info(CONTEXT, 'Attempting to create a new ad', { sellerId });

    if (!sellerId) {
        log.error(CONTEXT, 'User not authenticated.');
        return res.status(401).json({ message: 'User not authenticated' });
    }

    // With `multer`, text fields are in `req.body` and files in `req.files`.
    const { adData: adDataString } = req.body as { adData: string };
    const imageFiles = req.files as Express.Multer.File[];

    if (!adDataString) {
        log.error(CONTEXT, 'Ad data is missing from the request.');
        return res.status(400).json({ message: 'Ad data is required' });
    }

    try {
        const adData = JSON.parse(adDataString);
        log.debug(CONTEXT, 'Parsed adData', adData);
        const { title, description, price, category, location, tags } = adData;
        
        if (!title || !description || !price || !category || !location || !tags) {
            log.error(CONTEXT, 'Some required ad fields are missing.', adData);
            return res.status(400).json({ message: 'All ad fields are required' });
        }
        
        if (!imageFiles || imageFiles.length === 0) {
            log.error(CONTEXT, 'No images were uploaded.');
            return res.status(400).json({ message: 'At least one image is required' });
        }

        // The files are already uploaded to Cloudinary by the middleware.
        // `file.path` now contains the public URL from Cloudinary.
        const uploadedUrls = imageFiles.map(file => file.path);
        log.info(CONTEXT, 'Images successfully uploaded to Cloudinary.', { urls: uploadedUrls });
        
        const adId = cuid();
        const newAdResult = await query(
            `INSERT INTO "Ad" (id, title, description, price, category, location, tags, "imageUrls", "sellerId", "updatedAt") 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
             RETURNING *`,
            [adId, title, description, price, category, location, tags, uploadedUrls, sellerId, new Date()]
        );
        log.info(CONTEXT, `Ad successfully inserted into DB with id: ${adId}`);

        // Fetch the newly created ad with seller info to return to the client
        const finalAdResult = await query(`
            SELECT a.*,
                   json_build_object(
                       'id', u.id,
                       'name', u.name,
                       'avatarUrl', u."avatarUrl"
                   ) as seller
            FROM "Ad" as a
            JOIN "User" as u ON a."sellerId" = u.id
            WHERE a.id = $1
        `, [newAdResult.rows[0].id]);

        log.info(CONTEXT, 'Successfully created and fetched new ad.');
        res.status(201).json(finalAdResult.rows[0]);
    } catch (error) {
        log.error(CONTEXT, 'Failed to create ad.', error);
        res.status(500).json({ message: 'Failed to create ad' });
    }
};

// Update an existing ad
// FIX: Use qualified express types to resolve type conflicts.
export const updateAd = async (req: AuthRequest, res: express.Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const CONTEXT = `adController:updateAd(${id})`;
    log.info(CONTEXT, 'Attempting to update an ad.', { userId });
    
    const { adData: adDataString } = req.body as { adData: string };
    const newImageFiles = req.files as Express.Multer.File[];
    
    try {
        const adResult = await query('SELECT "sellerId", "imageUrls" FROM "Ad" WHERE id = $1', [id]);
        if (adResult.rows.length === 0) {
            log.info(CONTEXT, 'Ad not found.');
            return res.status(404).json({ message: 'Ad not found.' });
        }
        if (adResult.rows[0].sellerId !== userId) {
            log.error(CONTEXT, 'User is not authorized to update this ad.');
            return res.status(403).json({ message: 'You are not authorized to update this ad.' });
        }

        const adData = JSON.parse(adDataString);
        log.debug(CONTEXT, 'Parsed adData for update', adData);
        const { title, description, price, category, location, tags, existingImageUrls } = adData;
        
        // Get URLs of newly uploaded images from Cloudinary
        const newImageUrls = newImageFiles.map(file => file.path);
        
        // Combine existing URLs (that weren't deleted on the client) with new URLs
        const finalImageUrls = [...(existingImageUrls || []), ...newImageUrls];
        log.info(CONTEXT, 'Final image URLs for update.', { finalImageUrls });

        // TODO in a real app: Delete old images from Cloudinary that are no longer in `finalImageUrls`
        // This requires using the Cloudinary Admin API.

        const updateResult = await query(
            `UPDATE "Ad" SET 
                title = $1, 
                description = $2, 
                price = $3, 
                category = $4, 
                location = $5, 
                tags = $6, 
                "imageUrls" = $7, 
                "updatedAt" = $8 
             WHERE id = $9 RETURNING *`,
            [title, description, price, category, location, tags, finalImageUrls, new Date(), id]
        );
        log.info(CONTEXT, 'Successfully updated ad in DB.');

        const finalAdResult = await query(`
            SELECT a.*,
                   json_build_object(
                       'id', u.id,
                       'name', u.name,
                       'avatarUrl', u."avatarUrl"
                   ) as seller
            FROM "Ad" as a
            JOIN "User" as u ON a."sellerId" = u.id
            WHERE a.id = $1
        `, [updateResult.rows[0].id]);

        log.info(CONTEXT, 'Successfully fetched updated ad data.');
        res.status(200).json(finalAdResult.rows[0]);
    } catch (error) {
        log.error(CONTEXT, 'Failed to update ad.', error);
        res.status(500).json({ message: 'Failed to update ad.' });
    }
};


// Update ad status
// FIX: Use qualified express types to resolve type conflicts.
export const updateAdStatus = async (req: AuthRequest, res: express.Response) => {
    const { id } = req.params;
    const { status } = req.body as { status: AdStatus };
    const userId = req.user?.id;
    const CONTEXT = `adController:updateAdStatus(${id})`;
    log.info(CONTEXT, 'Attempting to update ad status.', { userId, newStatus: status });

    const validStatuses: AdStatus[] = ['active', 'reserved', 'sold', 'archived'];
    if (!status || !validStatuses.includes(status)) {
        log.error(CONTEXT, 'Invalid status provided.', { status });
        return res.status(400).json({ message: 'Invalid status provided.' });
    }

    try {
        const adResult = await query('SELECT "sellerId" FROM "Ad" WHERE id = $1', [id]);
        if (adResult.rows.length === 0) {
            log.info(CONTEXT, 'Ad not found.');
            return res.status(404).json({ message: 'Ad not found.' });
        }
        if (adResult.rows[0].sellerId !== userId) {
            log.error(CONTEXT, 'User is not authorized to update this ad status.');
            return res.status(403).json({ message: 'You are not authorized to update this ad.' });
        }

        const updateResult = await query(
            'UPDATE "Ad" SET status = $1, "updatedAt" = $2 WHERE id = $3 RETURNING *',
            [status, new Date(), id]
        );
        log.info(CONTEXT, 'Successfully updated ad status in DB.');

        const finalAdResult = await query(`
            SELECT a.*,
                   json_build_object(
                       'id', u.id,
                       'name', u.name,
                       'avatarUrl', u."avatarUrl"
                   ) as seller
            FROM "Ad" as a
            JOIN "User" as u ON a."sellerId" = u.id
            WHERE a.id = $1
        `, [updateResult.rows[0].id]);

        log.info(CONTEXT, 'Successfully fetched ad with updated status.');
        res.status(200).json(finalAdResult.rows[0]);
    } catch (error) {
        log.error(CONTEXT, 'Failed to update ad status.', error);
        res.status(500).json({ message: 'Failed to update ad status.' });
    }
};