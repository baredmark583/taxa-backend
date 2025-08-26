// FIX: To resolve type conflicts, using types directly from the express default import.
// FIX: Changed to a default import of express to use namespaced types.
// FIX: Use named imports for Request and Response to avoid global type conflicts.
import { Request, Response } from 'express';
import pool from '../db.js';
import { type AuthRequest } from '../middleware/auth.js';
import { type GeneratedAdData, type Ad, type User } from '../types.js';
import cuid from 'cuid';

// Use Express's built-in types for request and response handlers.
// FIX: Use express.Request and express.Response for type consistency.
// FIX: Use express.Request and express.Response to avoid conflict with global types.
// FIX: Use named Request and Response types.
export const getAllAds = async (req: Request, res: Response) => {
  try {
    // This query joins the Ad table with the User table to include seller details
    // It constructs a JSON object for the seller to match the frontend's expected structure
    const query = `
      SELECT 
        a.*, 
        json_build_object(
          'id', u.id,
          'name', u.name,
          'avatarUrl', u."avatarUrl"
        ) as seller
      FROM "Ad" as a
      JOIN "User" as u ON a."sellerId" = u.id
      ORDER BY a."createdAt" DESC;
    `;
    const adsResult = await pool.query(query);
    res.status(200).json(adsResult.rows);
  } catch (error) {
    console.error('Get all ads error:', error);
    res.status(500).json({ message: 'Failed to fetch ads' });
  }
};

// Use Express's built-in types for request and response handlers.
// FIX: Use express.Response for type consistency.
// FIX: Use express.Response to avoid conflict with global types.
// FIX: Use named Response type.
export const createAd = async (req: AuthRequest, res: Response) => {
  const { adData, imageUrls }: { adData: GeneratedAdData, imageUrls: string[] } = req.body;
  const sellerId = req.user?.id;

  if (!sellerId) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  try {
    const adId = cuid();
    const newAdResult = await pool.query(
      `INSERT INTO "Ad" (id, title, description, price, category, location, tags, "imageUrls", status, "sellerId", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING *`,
      [
        adId,
        adData.title,
        adData.description,
        adData.price,
        adData.category,
        adData.location,
        adData.tags,
        imageUrls,
        'active',
        sellerId,
        new Date()
      ]
    );

    const newAd: Ad = newAdResult.rows[0];

    // Fetch seller details to attach to the response, as the frontend expects it
    const sellerResult = await pool.query('SELECT id, name, "avatarUrl" FROM "User" WHERE id = $1', [sellerId]);
    const seller = sellerResult.rows[0];

    res.status(201).json({ ...newAd, seller });
  } catch (error) {
    console.error('Create ad error:', error);
    res.status(500).json({ message: 'Failed to create ad' });
  }
};

status(arg0: number): unknown;
