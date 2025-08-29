
// FIX: Switched to default express import and qualified types (express.Request, express.Response) to resolve property access errors from potential type conflicts.
// FIX: Import Request and Response types directly from express to fix type errors.
// FIX: Switched to default express import and qualified types to resolve type errors.
// FIX: Import Request and Response from express to resolve type errors.
// FIX: Use qualified express types to avoid conflicts with global types.
// FIX: Import Request and Response types directly from express to resolve type errors.
import { Request, Response } from 'express';
import { query } from '../db.js';
import { type AuthRequest } from '../middleware/auth.js';
import { log } from '../utils/logger.js';

// Get dashboard statistics
// FIX: Use Response for correct typing.
// FIX: Use imported Response type to fix type errors.
export const getStats = async (req: AuthRequest, res: Response) => {
    const CONTEXT = 'adminController:getStats';
    log.info(CONTEXT, 'Fetching dashboard statistics.');
    try {
        const userCountPromise = query('SELECT COUNT(*) FROM "User"');
        const adCountPromise = query('SELECT COUNT(*) FROM "Ad"');
        const adsByCategoryPromise = query('SELECT category, COUNT(*) as count FROM "Ad" GROUP BY category');
        const soldAdsCountPromise = query('SELECT COUNT(*) FROM "Ad" WHERE status = \'sold\'');
        const bannedUsersCountPromise = query('SELECT COUNT(*) FROM "User" WHERE status = \'banned\'');


        const [userResult, adResult, adsByCategoryResult, soldAdsResult, bannedUsersResult] = await Promise.all([
            userCountPromise,
            adCountPromise,
            adsByCategoryPromise,
            soldAdsCountPromise,
            bannedUsersCountPromise
        ]);

        const stats = {
            totalUsers: parseInt(userResult.rows[0].count, 10),
            totalAds: parseInt(adResult.rows[0].count, 10),
            adsByCategory: adsByCategoryResult.rows,
            soldAds: parseInt(soldAdsResult.rows[0].count, 10),
            bannedUsers: parseInt(bannedUsersResult.rows[0].count, 10),
        };
        log.info(CONTEXT, 'Successfully fetched statistics.', stats);
        res.status(200).json(stats);
    } catch (error) {
        log.error(CONTEXT, 'Failed to fetch stats.', error);
        res.status(500).json({ message: 'Failed to fetch stats' });
    }
};

// Get analytics data for charts
// FIX: Use Response for correct typing.
// FIX: Use imported Response type to fix type errors.
export const getAnalytics = async (req: AuthRequest, res: Response) => {
    const CONTEXT = 'adminController:getAnalytics';
    log.info(CONTEXT, 'Fetching analytics data for charts.');
    try {
        const userAnalyticsPromise = query(`
            SELECT DATE_TRUNC('day', "createdAt")::DATE AS date, COUNT(*) AS count
            FROM "User"
            WHERE "createdAt" >= NOW() - INTERVAL '30 days'
            GROUP BY date
            ORDER BY date;
        `);
        const adAnalyticsPromise = query(`
            SELECT DATE_TRUNC('day', "createdAt")::DATE AS date, COUNT(*) AS count
            FROM "Ad"
            WHERE "createdAt" >= NOW() - INTERVAL '30 days'
            GROUP BY date
            ORDER BY date;
        `);

        const [userAnalyticsResult, adAnalyticsResult] = await Promise.all([userAnalyticsPromise, adAnalyticsPromise]);
        
        const analyticsData = {
            userRegistrations: userAnalyticsResult.rows.map(r => ({ ...r, date: new Date(r.date).toISOString().split('T')[0], count: parseInt(r.count, 10) })),
            adPostings: adAnalyticsResult.rows.map(r => ({...r, date: new Date(r.date).toISOString().split('T')[0], count: parseInt(r.count, 10) })),
        };
        log.info(CONTEXT, 'Successfully fetched analytics data.');
        res.status(200).json(analyticsData);

    } catch (error) {
        log.error(CONTEXT, 'Failed to fetch analytics.', error);
        res.status(500).json({ message: 'Failed to fetch analytics' });
    }
};


// Get all users
// FIX: Use Response for correct typing.
// FIX: Use imported Response type to fix type errors.
export const getUsers = async (req: AuthRequest, res: Response) => {
  const CONTEXT = 'adminController:getUsers';
  log.info(CONTEXT, 'Fetching all users for admin.');
  try {
    const result = await query('SELECT id, name, email, role, status, "createdAt", latitude, longitude, city FROM "User" ORDER BY "createdAt" DESC');
    log.info(CONTEXT, `Successfully fetched ${result.rows.length} users.`);
    res.status(200).json(result.rows);
  } catch (error) {
    log.error(CONTEXT, 'Failed to fetch users.', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// Update a user
// FIX: Use Request and Response for correct typing.
// FIX: Use imported Request and Response types to fix type errors.
export const updateUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const CONTEXT = `adminController:updateUser(${id})`;
    log.info(CONTEXT, 'Attempting to update user.', { body: req.body });

    try {
        const { name, role, status } = req.body;

        if (!name || !role || !status) {
            log.error(CONTEXT, 'Required fields are missing.');
            return res.status(400).json({ message: 'Name, role, and status are required.' });
        }

        const result = await query(
            'UPDATE "User" SET name = $1, role = $2, status = $3, "updatedAt" = $4 WHERE id = $5 RETURNING id, name, email, role, status, "createdAt", latitude, longitude, city',
            [name, role, status, new Date(), id]
        );
        
        if (result.rows.length === 0) {
            log.info(CONTEXT, 'User not found.');
            return res.status(404).json({ message: 'User not found' });
        }
        log.info(CONTEXT, 'Successfully updated user.');
        res.status(200).json(result.rows[0]);
    } catch (error) {
        log.error(CONTEXT, 'Failed to update user.', error);
        res.status(500).json({ message: 'Failed to update user' });
    }
};


// Delete a user
// FIX: Use Request and Response for correct typing.
// FIX: Use imported Request and Response types to fix type errors.
export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const CONTEXT = `adminController:deleteUser(${id})`;
  log.info(CONTEXT, 'Attempting to delete user.');

  try {
    // Optional: First, handle related data, e.g., delete user's ads
    // await query('DELETE FROM "Ad" WHERE "sellerId" = $1', [id]);
    const result = await query('DELETE FROM "User" WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      log.info(CONTEXT, 'User not found for deletion.');
      return res.status(404).json({ message: 'User not found' });
    }
    log.info(CONTEXT, 'Successfully deleted user.');
    res.status(204).send();
  } catch (error) {
    log.error(CONTEXT, 'Failed to delete user.', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

// Get all ads
// FIX: Use Response for correct typing.
// FIX: Use imported Response type to fix type errors.
export const getAds = async (req: AuthRequest, res: Response) => {
  const CONTEXT = 'adminController:getAds';
  log.info(CONTEXT, 'Fetching all ads for admin.');
  try {
    const result = await query(`
        SELECT a.*, u.name as "sellerName"
        FROM "Ad" as a
        JOIN "User" as u ON a."sellerId" = u.id
        ORDER BY a."createdAt" DESC
    `);
    log.info(CONTEXT, `Successfully fetched ${result.rows.length} ads.`);
    res.status(200).json(result.rows);
  } catch (error) {
    log.error(CONTEXT, 'Failed to fetch ads.', error);
    res.status(500).json({ message: 'Failed to fetch ads' });
  }
};


// Update an ad
// FIX: Use Request and Response for correct typing.
// FIX: Use imported Request and Response types to fix type errors.
export const updateAd = async (req: Request, res: Response) => {
    const { id } = req.params;
    const CONTEXT = `adminController:updateAd(${id})`;
    log.info(CONTEXT, 'Attempting to update ad.', { body: req.body });

    try {
        const { title, description, price, status, isBoosted } = req.body;

        const result = await query(
            `UPDATE "Ad" 
             SET title = $1, description = $2, price = $3, status = $4, "isBoosted" = $5, "updatedAt" = $6 
             WHERE id = $7 
             RETURNING *`,
            [title, description, price, status, isBoosted, new Date(), id]
        );

        if (result.rows.length === 0) {
            log.info(CONTEXT, 'Ad not found.');
            return res.status(404).json({ message: 'Ad not found' });
        }
        
        // Refetch with seller name to match the getAds format
        const finalAdResult = await query(`
            SELECT a.*, u.name as "sellerName"
            FROM "Ad" as a
            JOIN "User" as u ON a."sellerId" = u.id
            WHERE a.id = $1
        `, [result.rows[0].id]);

        log.info(CONTEXT, 'Successfully updated ad.');
        res.status(200).json(finalAdResult.rows[0]);
    } catch (error) {
        log.error(CONTEXT, 'Failed to update ad.', error);
        res.status(500).json({ message: 'Failed to update ad' });
    }
};

// Delete an ad
// FIX: Use Request and Response for correct typing.
// FIX: Use imported Request and Response types to fix type errors.
export const deleteAd = async (req: Request, res: Response) => {
  const { id } = req.params;
  const CONTEXT = `adminController:deleteAd(${id})`;
  log.info(CONTEXT, 'Attempting to delete ad.');
  try {
    const result = await query('DELETE FROM "Ad" WHERE id = $1', [id]);
    if (result.rowCount === 0) {
        log.info(CONTEXT, 'Ad not found for deletion.');
        return res.status(404).json({ message: 'Ad not found' });
    }
    log.info(CONTEXT, 'Successfully deleted ad.');
    res.status(204).send();
  } catch (error) {
    log.error(CONTEXT, 'Failed to delete ad.', error);
    res.status(500).json({ message: 'Failed to delete ad' });
  }
};


// Get storage settings
// FIX: Use Response for correct typing.
// FIX: Use imported Response type to fix type errors.
export const getSettings = async (req: AuthRequest, res: Response) => {
    const CONTEXT = 'adminController:getSettings';
    log.info(CONTEXT, 'Fetching settings.');
    try {
        const result = await query('SELECT key, value FROM "Configuration"');
        const settings = result.rows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});

        // Mask secrets before sending to the client
        if (settings.s3_secret_access_key) {
            settings.s3_secret_access_key = '********';
        }
        if (settings.gcs_credentials) {
            settings.gcs_credentials = '********';
        }

        log.info(CONTEXT, 'Successfully fetched and masked settings.');
        res.status(200).json(settings);
    } catch (error) {
        log.error(CONTEXT, 'Failed to fetch settings.', error);
        res.status(500).json({ message: 'Failed to fetch settings' });
    }
};

// Update storage settings
// FIX: Use Response for correct typing.
// FIX: Use imported Response type to fix type errors.
export const updateSettings = async (req: AuthRequest, res: Response) => {
    const newSettings = req.body;
    const CONTEXT = 'adminController:updateSettings';
    log.info(CONTEXT, 'Attempting to update settings.', { newSettings });
    // Use the pool directly to manage transactions
    const client = await (await import('../db.js')).default.connect();
    try {
        await client.query('BEGIN');
        log.info(CONTEXT, 'Transaction started.');
        for (const key in newSettings) {
            let value = newSettings[key];
            // Do not update secrets if they are placeholders or empty
            const isSecret = key === 's3_secret_access_key' || key === 'gcs_credentials';
            if (isSecret && (value === '********' || value === '')) {
                log.debug(CONTEXT, `Skipping update for placeholder secret key: ${key}`);
                continue;
            }
            log.debug(CONTEXT, `Updating setting: ${key}`);
            await client.query(
                `UPDATE "Configuration" SET value = $1 WHERE key = $2`,
                [value, key]
            );
        }
        await client.query('COMMIT');
        log.info(CONTEXT, 'Transaction committed. Settings updated successfully.');
        res.status(200).json({ message: 'Settings updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        log.error(CONTEXT, 'Transaction rolled back. Failed to update settings.', error);
        res.status(500).json({ message: 'Failed to update settings' });
    } finally {
        client.release();
    }
};