// FIX: Use a default import for express and explicit types (e.g., express.Request) to avoid conflicts with global DOM types.
// FIX: Use fully-qualified express types to resolve conflicts.
// FIX: Import Request and Response types explicitly from express.
// FIX: Import Request and Response types from express to resolve property access errors.
// FIX: Using default express import and qualified types to resolve type conflicts.
// FIX: Using explicit named imports for Request and Response to resolve persistent type conflicts.
// FIX: Switched to named imports for express types to resolve property access errors.
import { Request, Response } from 'express';
import pool from '../db.js';
import cuid from 'cuid';
import { type Ad, type AdStatus } from '../types.js';
import { type AuthRequest } from '../middleware/auth.js';

// Get all ads
// FIX: Use explicit express types for request and response handlers to resolve property errors.
// FIX: Use fully-qualified express types.
// FIX: Use explicit Request and Response types from express.
// FIX: Use explicit Request and Response types from express to resolve property access errors.
// FIX: Using fully qualified express types to resolve property access errors.
// FIX: Use `express` namespace for types to avoid conflicts with global DOM types.
// FIX: Use named Request and Response imports to fix property access errors.
export const getAllAds = async (req: Request, res: Response) => {
    const { search, category, sortBy } = req.query;

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
// FIX: Use named Request and Response imports to fix property access errors.
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
// FIX: Use explicit express.Response type. AuthRequest is correctly typed from its definition.
// FIX: Use fully-qualified express.Response type.
// FIX: Use explicit AuthRequest and Response types.
// FIX: Use explicit Response type from express to resolve property access errors.
// FIX: Using fully qualified express types to resolve property access errors.
// FIX: Use `express` namespace for types to avoid conflicts with global DOM types.
// FIX: Use named Response import to fix property access errors.
export const createAd = async (req: AuthRequest, res: Response) => {
    const { adData, imageUrls } = req.body;
    const sellerId = req.user?.id;

    if (!sellerId) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!adData || !imageUrls || imageUrls.length === 0) {
        return res.status(400).json({ message: 'Ad data and at least one image URL are required' });
    }
    
    const { title, description, price, category, location, tags } = adData;

    if (!title || !description || !price || !category || !location || !tags) {
        return res.status(400).json({ message: 'All ad fields are required' });
    }

    try {
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

// Update ad status
// FIX: Use `express` namespace for types to avoid conflicts with global DOM types.
// FIX: Use named Response import to fix property access errors.
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