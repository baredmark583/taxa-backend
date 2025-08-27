// FIX: Import 'express' and its types to use explicit types like Request, avoiding conflicts with global DOM types.
// FIX: Use explicit Request, Response types from express to resolve type conflicts.
// FIX: Corrected Express types to use named imports.
// FIX: Use express.Request and express.Response to resolve type conflicts.
import express from 'express';
import pool from '../db.js';
import { type AuthRequest } from '../middleware/auth.js';
import { type GeneratedAdData, type Ad, type User } from '../types.js';
import cuid from 'cuid';

// FIX: Use explicit express types for request and response handlers.
// FIX: Use explicit Request and Response types from express import
// FIX: Use explicit Request, Response types from express to resolve type conflicts.
// FIX: Switched to explicit express.Request and express.Response to resolve type conflicts.
// FIX: Use explicit express types to resolve property errors.
export const getAllAds = async (req: express.Request, res: express.Response) => {
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

// FIX: Added missing controller function to fetch a single ad by ID.
// FIX: Use explicit Request, Response types from express to resolve type conflicts.
// FIX: Switched to explicit express.Request and express.Response to resolve type conflicts.
// FIX: Use explicit express types to resolve property errors.
export const getAdById = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  try {
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
      WHERE a.id = $1;
    `;
    const adResult = await pool.query(query, [id]);

    if (adResult.rows.length === 0) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    res.status(200).json(adResult.rows[0]);
  } catch (error) {
    console.error(`Get ad by ID error (ID: ${id}):`, error);
    res.status(500).json({ message: 'Failed to fetch ad' });
  }
};


// FIX: Use explicit express types for request and response handlers. AuthRequest is correctly typed from its definition.
// FIX: Use explicit Response type from express import
// FIX: Completed the implementation of the createAd function.
// FIX: Use explicit Response type from express to resolve type conflicts.
// FIX: Switched to explicit express.Response to resolve type conflicts.
// FIX: Use explicit express types to resolve property errors.
export const createAd = async (req: AuthRequest, res: express.Response) => {
  const { adData, imageUrls }: { adData: GeneratedAdData, imageUrls: string[] } = req.body;
  const sellerId = req.user?.id;

  if (!sellerId) {
    return res.status(401).json({ message: 'Authorization required to create an ad.' });
  }

  if (!adData || !imageUrls || imageUrls.length === 0) {
      return res.status(400).json({ message: 'Ad data and at least one image are required.' });
  }
  
  const adId = cuid();
  const { title, description, price, category, location, tags } = adData;

  try {
    // Insert the new ad
    await pool.query(
      `INSERT INTO "Ad" (id, title, description, price, category, location, tags, "imageUrls", "sellerId", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [adId, title, description, price, category, location, tags, imageUrls, sellerId, new Date()]
    );
    
    // Fetch the newly created ad with seller details to return to the client
    const newAdQuery = `
      SELECT 
        a.*, 
        json_build_object(
          'id', u.id,
          'name', u.name,
          'avatarUrl', u."avatarUrl"
        ) as seller
      FROM "Ad" as a
      JOIN "User" as u ON a."sellerId" = u.id
      WHERE a.id = $1;
    `;
    const newAdResult = await pool.query(newAdQuery, [adId]);
    
    if (newAdResult.rows.length === 0) {
        // This case is unlikely but good for robustness
        throw new Error("Failed to retrieve the newly created ad.");
    }

    res.status(201).json(newAdResult.rows[0]);

  } catch (error) {
    console.error('Create ad error:', error);
    res.status(500).json({ message: 'Failed to create ad' });
  }
};