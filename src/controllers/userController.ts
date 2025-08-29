




// FIX: Only import types from express, as the default export is not used. This helps avoid potential type conflicts.
import { Response } from 'express';
import { query } from '../db.js';
import { type AuthRequest } from '../middleware/auth.js';
import { log } from '../utils/logger.js';

// Get user's favorite ad IDs
export const getFavoriteAdIds = async (req: AuthRequest, res: Response) => {
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
export const addFavorite = async (req: AuthRequest, res: Response) => {
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
export const removeFavorite = async (req: AuthRequest, res: Response) => {
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
export const getFavoriteAds = async (req: AuthRequest, res: Response) => {
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