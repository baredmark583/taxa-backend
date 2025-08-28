// FIX: Replaced named type imports with a default import to use qualified types (e.g., `express.Response`) and resolve type conflicts.
import express from 'express';
import pool from '../db.js';
import { type AuthRequest } from '../middleware/auth.js';

// Get user's favorite ad IDs
// FIX: Use qualified express types for request and response handlers to resolve property errors on `res.status`.
export const getFavoriteAdIds = async (req: AuthRequest, res: express.Response) => {
    const userId = req.user?.id;
    try {
        const result = await pool.query('SELECT "adId" FROM "Favorite" WHERE "userId" = $1', [userId]);
        res.status(200).json(result.rows.map(row => row.adId));
    } catch (error) {
        console.error('Get favorite ad IDs error:', error);
        res.status(500).json({ message: 'Failed to fetch favorite ads' });
    }
};

// Add an ad to favorites
// FIX: Use qualified express types for request and response handlers to resolve property errors on `req.params` and `res.status`.
export const addFavorite = async (req: AuthRequest, res: express.Response) => {
    const userId = req.user?.id;
    const { adId } = req.params;
    try {
        await pool.query(
            'INSERT INTO "Favorite" ("userId", "adId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [userId, adId]
        );
        res.status(201).send();
    } catch (error) {
        console.error('Add favorite error:', error);
        res.status(500).json({ message: 'Failed to add ad to favorites' });
    }
};

// Remove an ad from favorites
// FIX: Use qualified express types for request and response handlers to resolve property errors on `req.params` and `res.status`.
export const removeFavorite = async (req: AuthRequest, res: express.Response) => {
    const userId = req.user?.id;
    const { adId } = req.params;
    try {
        await pool.query(
            'DELETE FROM "Favorite" WHERE "userId" = $1 AND "adId" = $2',
            [userId, adId]
        );
        res.status(204).send();
    } catch (error) {
        console.error('Remove favorite error:', error);
        res.status(500).json({ message: 'Failed to remove ad from favorites' });
    }
};

// Get ads favorited by the user
// FIX: Use qualified express types for request and response handlers to resolve property errors on `res.status`.
export const getFavoriteAds = async (req: AuthRequest, res: express.Response) => {
    const userId = req.user?.id;
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
            JOIN "Favorite" as f ON a.id = f."adId"
            WHERE f."userId" = $1
            ORDER BY f."createdAt" DESC
        `, [userId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Get favorite ads error:', error);
        res.status(500).json({ message: 'Failed to fetch favorite ads' });
    }
}