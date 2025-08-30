// FIX: Use a single default import for express to avoid type conflicts.
// FIX: Import Response type directly from express.
// FIX: Import Response from express.
import express from 'express';
import { query } from '../db.js';
import { type AuthRequest } from '../middleware/auth.js';
import { log } from '../utils/logger.js';
import crypto from 'crypto';

// Get user's favorite ad IDs
// FIX: Use qualified express types to fix property access errors.
// FIX: Use qualified express.Response type to fix property access errors.
// FIX: Use imported Response type.
// FIX: Use qualified express types to resolve property access errors.
// FIX: Use Response type to fix property access errors.
// FIX: Use express.Response to fix type errors.
export const getFavoriteAdIds = async (req: AuthRequest, res: express.Response) => {
    const userId = req.user?.id;
    const CONTEXT = `userController:getFavoriteAdIds(${userId})`;
    log.info(CONTEXT, "Fetching user's favorite ad IDs.");
    try {
        const result = await query('SELECT "adId" FROM "Favorite" WHERE "userId" = $1', [userId]);
        const ids = result.rows.map(row => row.adId);
        log.info(CONTEXT, `Successfully fetched ${ids.length} favorite ad IDs.`);
        res.status(200).json(ids);
    } catch (error) {
        log.error(CONTEXT, 'Failed to fetch favorite ad IDs.', error);
        res.status(500).json({ message: 'Failed to fetch favorite ads' });
    }
};

// Add an ad to favorites
// FIX: Use qualified express types to fix property access errors.
// FIX: Use qualified express.Response type to fix property access errors.
// FIX: Use imported Response type.
// FIX: Use qualified express types to resolve property access errors.
// FIX: Use Response type to fix property access errors.
// FIX: Use express.Response to fix type errors.
export const addFavorite = async (req: AuthRequest, res: express.Response) => {
    const userId = req.user?.id;
    const { adId } = req.params;
    const CONTEXT = `userController:addFavorite(${userId})`;
    log.info(CONTEXT, "Adding ad to favorites.", { adId });
    try {
        await query(
            'INSERT INTO "Favorite" ("userId", "adId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [userId, adId]
        );
        log.info(CONTEXT, "Successfully added ad to favorites.");
        res.status(201).send();
    } catch (error) {
        log.error(CONTEXT, 'Failed to add ad to favorites.', error);
        res.status(500).json({ message: 'Failed to add ad to favorites' });
    }
};

// Remove an ad from favorites
// FIX: Use qualified express types to fix property access errors.
// FIX: Use qualified express.Response type to fix property access errors.
// FIX: Use imported Response type.
// FIX: Use qualified express types to resolve property access errors.
// FIX: Use Response type to fix property access errors.
// FIX: Use express.Response to fix type errors.
export const removeFavorite = async (req: AuthRequest, res: express.Response) => {
    const userId = req.user?.id;
    const { adId } = req.params;
    const CONTEXT = `userController:removeFavorite(${userId})`;
    log.info(CONTEXT, "Removing ad from favorites.", { adId });
    try {
        await query(
            'DELETE FROM "Favorite" WHERE "userId" = $1 AND "adId" = $2',
            [userId, adId]
        );
        log.info(CONTEXT, "Successfully removed ad from favorites.");
        res.status(204).send();
    } catch (error) {
        log.error(CONTEXT, 'Failed to remove ad from favorites.', error);
        res.status(500).json({ message: 'Failed to remove ad from favorites' });
    }
};

// Get ads favorited by the user
// FIX: Use qualified express types to fix property access errors.
// FIX: Use qualified express.Response type to fix property access errors.
// FIX: Use imported Response type.
// FIX: Use qualified express types to resolve property access errors.
// FIX: Use Response type to fix property access errors.
// FIX: Use express.Response to fix type errors.
export const getFavoriteAds = async (req: AuthRequest, res: express.Response) => {
    const userId = req.user?.id;
    const CONTEXT = `userController:getFavoriteAds(${userId})`;
    log.info(CONTEXT, "Fetching user's favorite ads.");
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
            JOIN "Favorite" as f ON a.id = f."adId"
            WHERE f."userId" = $1
            ORDER BY f."createdAt" DESC
        `, [userId]);
        log.info(CONTEXT, `Successfully fetched ${result.rows.length} favorite ads.`);
        res.status(200).json(result.rows);
    } catch (error) {
        log.error(CONTEXT, 'Failed to fetch favorite ads.', error);
        res.status(500).json({ message: 'Failed to fetch favorite ads' });
    }
}

// FIX: Use qualified express types to fix property access errors.
// FIX: Use qualified express.Response type to fix property access errors.
// FIX: Use imported Response type.
// FIX: Use qualified express types to resolve property access errors.
// FIX: Use Response type to fix property access errors.
// FIX: Use express.Response to fix type errors.
export const generateWebCode = async (req: AuthRequest, res: express.Response) => {
    const userId = req.user?.id;
    const CONTEXT = `userController:generateWebCode(${userId})`;
    log.info(CONTEXT, "Generating a one-time web login code.");

    if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
    }
    
    // Use a transaction to ensure atomicity
    const client = await (await import('../db.js')).default.connect();
    try {
        await client.query('BEGIN');
        // Delete any previous codes for this user
        await client.query('DELETE FROM "WebLoginCode" WHERE "userId" = $1', [userId]);

        // Generate a cryptographically secure random 6-character code (e.g., ABC-XYZ)
        const code = crypto.randomBytes(4).toString('hex').toUpperCase().substring(0, 6);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

        await client.query(
            'INSERT INTO "WebLoginCode" (code, "userId", "expiresAt") VALUES ($1, $2, $3)',
            [code, userId, expiresAt]
        );

        await client.query('COMMIT');
        
        log.info(CONTEXT, "Successfully generated and stored new web login code.");
        res.status(201).json({ code, expiresAt });

    } catch (error) {
        await client.query('ROLLBACK');
        log.error(CONTEXT, "Failed to generate web login code.", error);
        res.status(500).json({ message: 'Failed to generate code' });
    } finally {
        client.release();
    }
};