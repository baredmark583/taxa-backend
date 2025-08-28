// FIX: Use a default import for express and explicit types (e.g., express.Response) to avoid conflicts with global DOM types.
// FIX: Use fully-qualified express.Response to resolve conflicts.
// FIX: Import Request and Response types explicitly from express.
// FIX: Import Request and Response types from express to resolve property access errors.
// FIX: Using default express import and qualified types to resolve type conflicts.
// FIX: Using explicit named imports for Request and Response to resolve persistent type conflicts.
// FIX: Switched to named imports for express types to resolve property access errors.
import { Request, Response } from 'express';
import pool from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

// Get dashboard statistics
// FIX: Use explicit express.Response type to resolve property errors.
// FIX: Use fully-qualified express.Response type.
// FIX: Use explicit AuthRequest and Response types.
// FIX: Use explicit Response type from express to resolve property access errors.
// FIX: Using fully qualified express types to resolve property access errors.
// FIX: Use `express` namespace for types to avoid conflicts with global DOM types.
// FIX: Use named Response import to fix property access errors.
export const getStats = async (req: AuthRequest, res: Response) => {
    try {
        const userCountPromise = pool.query('SELECT COUNT(*) FROM "User"');
        const adCountPromise = pool.query('SELECT COUNT(*) FROM "Ad"');
        const adsByCategoryPromise = pool.query('SELECT category, COUNT(*) as count FROM "Ad" GROUP BY category');
        const soldAdsCountPromise = pool.query('SELECT COUNT(*) FROM "Ad" WHERE status = \'sold\'');
        const bannedUsersCountPromise = pool.query('SELECT COUNT(*) FROM "User" WHERE status = \'banned\'');


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

        res.status(200).json(stats);
    } catch (error) {
        console.error('Admin get stats error:', error);
        res.status(500).json({ message: 'Failed to fetch stats' });
    }
};

// Get analytics data for charts
// FIX: Use explicit AuthRequest and Response types from express.
// FIX: Use explicit Response type from express to resolve property access errors.
// FIX: Using fully qualified express types to resolve property access errors.
// FIX: Use `express` namespace for types to avoid conflicts with global DOM types.
// FIX: Use named Response import to fix property access errors.
export const getAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const userAnalyticsPromise = pool.query(`
            SELECT DATE_TRUNC('day', "createdAt")::DATE AS date, COUNT(*) AS count
            FROM "User"
            WHERE "createdAt" >= NOW() - INTERVAL '30 days'
            GROUP BY date
            ORDER BY date;
        `);
        const adAnalyticsPromise = pool.query(`
            SELECT DATE_TRUNC('day', "createdAt")::DATE AS date, COUNT(*) AS count
            FROM "Ad"
            WHERE "createdAt" >= NOW() - INTERVAL '30 days'
            GROUP BY date
            ORDER BY date;
        `);

        const [userAnalyticsResult, adAnalyticsResult] = await Promise.all([userAnalyticsPromise, adAnalyticsPromise]);

        res.status(200).json({
            userRegistrations: userAnalyticsResult.rows.map(r => ({ ...r, date: new Date(r.date).toISOString().split('T')[0], count: parseInt(r.count, 10) })),
            adPostings: adAnalyticsResult.rows.map(r => ({...r, date: new Date(r.date).toISOString().split('T')[0], count: parseInt(r.count, 10) })),
        });

    } catch (error) {
        console.error('Admin get analytics error:', error);
        res.status(500).json({ message: 'Failed to fetch analytics' });
    }
};


// Get all users
// FIX: Use explicit express.Response type to resolve property errors.
// FIX: Use fully-qualified express.Response type.
// FIX: Use explicit AuthRequest and Response types.
// FIX: Use explicit Response type from express to resolve property access errors.
// FIX: Using fully qualified express types to resolve property access errors.
// FIX: Use `express` namespace for types to avoid conflicts with global DOM types.
// FIX: Use named Response import to fix property access errors.
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, status, "createdAt", latitude, longitude, city FROM "User" ORDER BY "createdAt" DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// Update a user
// FIX: Use explicit AuthRequest and Response types.
// FIX: Use explicit Request and Response types from express to resolve property access errors.
// FIX: Using fully qualified express types to resolve property access errors.
// FIX: Use `express` namespace for types to avoid conflicts with global DOM types.
// FIX: Use named Request and Response imports to fix property access errors.
export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, role, status } = req.body;

        if (!name || !role || !status) {
            return res.status(400).json({ message: 'Name, role, and status are required.' });
        }

        const result = await pool.query(
            'UPDATE "User" SET name = $1, role = $2, status = $3, "updatedAt" = $4 WHERE id = $5 RETURNING id, name, email, role, status, "createdAt", latitude, longitude, city',
            [name, role, status, new Date(), id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Admin update user error:', error);
        res.status(500).json({ message: 'Failed to update user' });
    }
};


// Delete a user
// FIX: Use explicit AuthRequest and Response types.
// FIX: Use explicit Request and Response types from express to resolve property access errors.
// FIX: Using fully qualified express types to resolve property access errors.
// FIX: Use `express` namespace for types to avoid conflicts with global DOM types.
// FIX: Use named Request and Response imports to fix property access errors.
export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Optional: First, handle related data, e.g., delete user's ads
    // await pool.query('DELETE FROM "Ad" WHERE "sellerId" = $1', [id]);
    const result = await pool.query('DELETE FROM "User" WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

// Get all ads
// FIX: Use explicit AuthRequest and Response types.
// FIX: Use explicit Response type from express to resolve property access errors.
// FIX: Using fully qualified express types to resolve property access errors.
// FIX: Use `express` namespace for types to avoid conflicts with global DOM types.
// FIX: Use named Response import to fix property access errors.
export const getAds = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
        SELECT a.*, u.name as "sellerName"
        FROM "Ad" as a
        JOIN "User" as u ON a."sellerId" = u.id
        ORDER BY a."createdAt" DESC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Admin get ads error:', error);
    res.status(500).json({ message: 'Failed to fetch ads' });
  }
};


// Update an ad
// FIX: Use explicit Request and Response types from express.
// FIX: Use explicit Request and Response types from express to resolve property access errors.
// FIX: Using fully qualified express types to resolve property access errors.
// FIX: Use `express` namespace for types to avoid conflicts with global DOM types.
// FIX: Use named Request and Response imports to fix property access errors.
export const updateAd = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, description, price, status, isBoosted } = req.body;

        const result = await pool.query(
            `UPDATE "Ad" 
             SET title = $1, description = $2, price = $3, status = $4, "isBoosted" = $5, "updatedAt" = $6 
             WHERE id = $7 
             RETURNING *`,
            [title, description, price, status, isBoosted, new Date(), id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ad not found' });
        }
        
        // Refetch with seller name to match the getAds format
        const finalAdResult = await pool.query(`
            SELECT a.*, u.name as "sellerName"
            FROM "Ad" as a
            JOIN "User" as u ON a."sellerId" = u.id
            WHERE a.id = $1
        `, [result.rows[0].id]);


        res.status(200).json(finalAdResult.rows[0]);
    } catch (error) {
        console.error('Admin update ad error:', error);
        res.status(500).json({ message: 'Failed to update ad' });
    }
};

// Delete an ad
// FIX: Use explicit Request and Response types from express.
// FIX: Use explicit Request and Response types from express to resolve property access errors.
// FIX: Using fully qualified express types to resolve property access errors.
// FIX: Use `express` namespace for types to avoid conflicts with global DOM types.
// FIX: Use named Request and Response imports to fix property access errors.
export const deleteAd = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM "Ad" WHERE id = $1', [id]);
    if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Ad not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Admin delete ad error:', error);
    res.status(500).json({ message: 'Failed to delete ad' });
  }
};