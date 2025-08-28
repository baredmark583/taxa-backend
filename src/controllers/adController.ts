// FIX: Use a default import for express and explicit types (e.g., express.Request) to avoid conflicts with global DOM types.
// FIX: Use fully-qualified express types to resolve conflicts.
// FIX: Import Request and Response types explicitly from express.
// FIX: Import Request and Response types from express to resolve property access errors.
// FIX: Using default express import and qualified types to resolve type conflicts.
// FIX: Using explicit named imports for Request and Response to resolve persistent type conflicts.
// FIX: Switched to named imports for express types to resolve property access errors.
// FIX: Use a default import for express and qualified types (e.g., express.Request) to resolve type errors.
// FIX: Use explicit named imports for Request and Response to resolve type conflicts with global DOM types.
// FIX: Use named imports for express types to resolve type conflicts and property access errors.
// FIX: Use default express import and qualified types like express.Request to resolve all type conflicts.
// FIX: Use named imports for express types to resolve property access errors.
import express from 'express';
import pool from '../db.js';
import cuid from 'cuid';
import { type Ad, type AdStatus } from '../types.js';
import { type AuthRequest } from '../middleware/auth.js';
// Import Node.js modules for file handling
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper constants for file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all ads
// FIX: Use explicit express types for request and response handlers to resolve property errors.
// FIX: Use fully-qualified express types.
// FIX: Use explicit Request and Response types from express.
// FIX: Use explicit Request and Response types from express to resolve property access errors.
// FIX: Using fully qualified express types to resolve property access errors.
// FIX: Use `express` namespace for types to avoid conflicts with global DOM types.
// FIX: Use qualified express types to resolve property access errors.
// FIX: Use named express types to resolve property access errors.
// FIX: Use qualified express types to resolve property access errors.
export const getAllAds = async (req: express.Request, res: express.Response) => {
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
// FIX: Use explicit express types for request and response handlers to resolve property errors.
// FIX: Use fully-qualified express types.
// FIX: Use explicit Request and Response types from express.
// FIX: Use explicit Request and Response types from express to resolve property access errors.
// FIX: Using fully qualified express types to resolve property access errors.
// FIX: Use `express` namespace for types to avoid conflicts with global DOM types.
// FIX: Use qualified express types to resolve property access errors.
// FIX: Use named express types to resolve property access errors.
// FIX: Use qualified express types to resolve property access errors.
export const getAdById = async (req: express.Request, res: express.Response) => {
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
// FIX: Rewritten to handle multipart/form-data for file uploads instead of base64 strings.
// FIX: Use named express types to resolve property access errors.
// FIX: Use qualified express types to resolve property access errors.
export const createAd = async (req: AuthRequest, res: express.Response) => {
    const sellerId = req.user?.id;
    if (!sellerId) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

    // `express-formidable` places fields in `req.fields` and files in `req.files`.
    const { adData: adDataString } = req.fields as { adData: string };
    const imageFiles = req.files?.images; // 'images' is the key from FormData

    if (!adDataString) {
        return res.status(400).json({ message: 'Ad data is required' });
    }

    try {
        const adData = JSON.parse(adDataString);
        const { title, description, price, category, location, tags } = adData;
        
        if (!title || !description || !price || !category || !location || !tags) {
            return res.status(400).json({ message: 'All ad fields are required' });
        }

        const imageUrls: string[] = [];
        const filesToProcess = Array.isArray(imageFiles) ? imageFiles : (imageFiles ? [imageFiles] : []);
        
        if (filesToProcess.length === 0) {
            return res.status(400).json({ message: 'At least one image is required' });
        }

        // Process and move uploaded files
        for (const file of filesToProcess) {
            if (file.size > 0) {
                const newFileName = `${cuid()}${path.extname(file.name)}`;
                const newPath = path.join(__dirname, '..', '..', 'public', 'uploads', newFileName);
                fs.renameSync(file.path, newPath);
                // Construct the public URL to be stored in the DB
                imageUrls.push(`/uploads/${newFileName}`);
            }
        }
        
        const adId = cuid();
        const newAdResult = await pool.query(
            `INSERT INTO "Ad" (id, title, description, price, category, location, tags, "imageUrls", "sellerId", "updatedAt") 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
             RETURNING *`,
            [adId, title, description, price, category, location, tags, imageUrls, sellerId, new Date()]
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
// FIX: Rewritten to handle multipart/form-data for potential new image uploads.
// FIX: Use named express types to resolve property access errors.
// FIX: Use qualified express types to resolve property access errors.
export const updateAd = async (req: AuthRequest, res: express.Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    
    const { adData: adDataString } = req.fields as { adData: string };
    const imageFiles = req.files?.images; // New images being uploaded

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
        
        const newImageUrls: string[] = [];
        const filesToProcess = Array.isArray(imageFiles) ? imageFiles : (imageFiles ? [imageFiles] : []);

        // Process and move any newly uploaded files
        for (const file of filesToProcess) {
            if (file.size > 0) {
                const newFileName = `${cuid()}${path.extname(file.name)}`;
                const newPath = path.join(__dirname, '..', '..', 'public', 'uploads', newFileName);
                fs.renameSync(file.path, newPath);
                newImageUrls.push(`/uploads/${newFileName}`);
            }
        }
        
        // Combine existing URLs (that weren't deleted on the client) with new URLs
        const finalImageUrls = [...(existingImageUrls || []), ...newImageUrls];

        // Here you might want to delete old images from the filesystem that are no longer in `finalImageUrls`
        // For simplicity, this step is omitted, but in a production app it's important to avoid orphaned files.

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
// FIX: Use `express` namespace for types to avoid conflicts with global DOM types.
// FIX: Use qualified express.Response type to fix property access errors.
// FIX: Use named express types to resolve property access errors.
// FIX: Use qualified express types to resolve property access errors.
export const updateAdStatus = async (req: AuthRequest, res: express.Response) => {
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