// FIX: Use a default import for express and explicit types (e.g., express.Request) to avoid conflicts with global DOM types.
// FIX: Use fully-qualified express types to resolve conflicts.
// FIX: Use named imports for Request and Response to resolve type conflicts with global DOM types.
import express from 'express';
import pool from '../db.js';
import cuid from 'cuid';
import { type Ad } from '../types.js';
import { type AuthRequest } from '../middleware/auth.js';

// Get all ads
// FIX: Use explicit express types for request and response handlers to resolve property errors.
export const getAllAds = async (req: express.Request, res: express.Response) => {
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
            ORDER BY a."createdAt" DESC
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Get all ads error:', error);
        res.status(500).json({ message: 'Failed to fetch ads' });
    }
};

// Get a single ad by ID
// FIX: Use explicit express types for request and response handlers to resolve property errors.
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
// FIX: Use explicit express.Response type. AuthRequest is correctly typed from its definition.
export const createAd = async (req: AuthRequest, res: express.Response) => {
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