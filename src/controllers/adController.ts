// FIX: Switched to named, type-only imports to resolve type conflicts.
import { Request, Response } from 'express';
// FIX: Added 'multer' import to make Express.Multer.File type available.
import 'multer';
import pool from '../db.js';
import cuid from 'cuid';
import { type Ad, type AdStatus } from '../types.js';
import { type AuthRequest } from '../middleware/auth.js';

// Get all ads
// FIX: Use named Express types for request and response handlers.
export const getAllAds = async (req: Request, res: Response) => {
    const { search, category, sortBy, sellerId } = req.query;

    let query = `
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
        query += ' WHERE ' + whereClauses.join(' AND ');
    }

    let orderByClause = 'ORDER BY a."isBoosted" DESC';
    if (sortBy === 'price_asc') {
        orderByClause += ', a.price::NUMERIC ASC';
    } else if (sortBy === 'price_desc') {
        orderByClause += ', a.price::NUMERIC DESC';
    } else {
        orderByClause += ', a."createdAt" DESC';
    }
    query += ` ${orderByClause}`;

    try {
        const result = await pool.query(query, params);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Get all ads error:', error);
        res.status(500).json({ message: 'Failed to fetch ads' });
    }
};

// Get a single ad by ID
// FIX: Use named Express types for request and response handlers.
export const getAdById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`
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
            return res.status(404).json({ message: 'Ad not found' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(`Get ad by id error (id: ${id}):`, error);
        res.status(500).json({ message: 'Failed to fetch ad' });
    }
};

// Create a new ad
// FIX: Use named Express types for request and response handlers.
export const createAd = async (req: AuthRequest, res: Response) => {
    const sellerId = req.user?.id;
    if (!sellerId) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

    // With `multer`, text fields are in `req.body` and files in `req.files`.
    const { adData: adDataString } = req.body as { adData: string };
    const imageFiles = req.files as Express.Multer.File[];

    if (!adDataString) {
        return res.status(400).json({ message: 'Ad data is required' });
    }

    try {
        const adData = JSON.parse(adDataString);
        const { title, description, price, category, location, tags } = adData;
        
        if (!title || !description || !price || !category || !location || !tags) {
            return res.status(400).json({ message: 'All ad fields are required' });
        }
        
        if (!imageFiles || imageFiles.length === 0) {
            return res.status(400).json({ message: 'At least one image is required' });
        }

        // The files are already uploaded to Cloudinary by the middleware.
        // `file.path` now contains the public URL from Cloudinary.
        const uploadedUrls = imageFiles.map(file => file.path);
        
        const adId = cuid();
        const newAdResult = await pool.query(
            `INSERT INTO "Ad" (id, title, description, price, category, location, tags, "imageUrls", "sellerId", "updatedAt") 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
             RETURNING *`,
            [adId, title, description, price, category, location, tags, uploadedUrls, sellerId, new Date()]
        );

        // Fetch the newly created ad with seller info to return to the client
        const finalAdResult = await pool.query(`
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


        res.status(201).json(finalAdResult.rows[0]);
    } catch (error) {
        console.error('Create ad error:', error);
        res.status(500).json({ message: 'Failed to create ad' });
    }
};

// Update an existing ad
// FIX: Use named Express types for request and response handlers.
export const updateAd = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    
    const { adData: adDataString } = req.body as { adData: string };
    const newImageFiles = req.files as Express.Multer.File[];
    
    try {
        const adResult = await pool.query('SELECT "sellerId", "imageUrls" FROM "Ad" WHERE id = $1', [id]);
        if (adResult.rows.length === 0) {
            return res.status(404).json({ message: 'Ad not found.' });
        }
        if (adResult.rows[0].sellerId !== userId) {
            return res.status(403).json({ message: 'You are not authorized to update this ad.' });
        }

        const adData = JSON.parse(adDataString);
        const { title, description, price, category, location, tags, existingImageUrls } = adData;
        
        // Get URLs of newly uploaded images from Cloudinary
        const newImageUrls = newImageFiles.map(file => file.path);
        
        // Combine existing URLs (that weren't deleted on the client) with new URLs
        const finalImageUrls = [...(existingImageUrls || []), ...newImageUrls];

        // TODO in a real app: Delete old images from Cloudinary that are no longer in `finalImageUrls`
        // This requires using the Cloudinary Admin API.

        const updateResult = await pool.query(
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

        const finalAdResult = await pool.query(`
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


        res.status(200).json(finalAdResult.rows[0]);
    } catch (error) {
        console.error(`Update ad error (id: ${id}):`, error);
        res.status(500).json({ message: 'Failed to update ad.' });
    }
};


// Update ad status
// FIX: Use named Express types for request and response handlers.
export const updateAdStatus = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body as { status: AdStatus };
    const userId = req.user?.id;

    const validStatuses: AdStatus[] = ['active', 'reserved', 'sold', 'archived'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status provided.' });
    }

    try {
        const adResult = await pool.query('SELECT "sellerId" FROM "Ad" WHERE id = $1', [id]);
        if (adResult.rows.length === 0) {
            return res.status(404).json({ message: 'Ad not found.' });
        }
        if (adResult.rows[0].sellerId !== userId) {
            return res.status(403).json({ message: 'You are not authorized to update this ad.' });
        }

        const updateResult = await pool.query(
            'UPDATE "Ad" SET status = $1, "updatedAt" = $2 WHERE id = $3 RETURNING *',
            [status, new Date(), id]
        );

        const finalAdResult = await pool.query(`
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


        res.status(200).json(finalAdResult.rows[0]);
    } catch (error) {
        console.error(`Update ad status error (id: ${id}):`, error);
        res.status(500).json({ message: 'Failed to update ad status.' });
    }
};