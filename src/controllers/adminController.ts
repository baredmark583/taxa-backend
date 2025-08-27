// FIX: Use explicit express types to avoid conflicts with global DOM types.
// FIX: Import Response explicitly to avoid conflicts with DOM types.
import express from 'express';
import pool from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

// Get all users
// FIX: Use explicit Response type from express to fix property errors.
export const getUsers = async (req: AuthRequest, res: express.Response) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, "createdAt" FROM "User" ORDER BY "createdAt" DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// Delete a user
// FIX: Use explicit Response type from express to fix property errors.
export const deleteUser = async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    // Prevent admin from deleting themselves
    if (id === req.user?.id) {
        return res.status(400).json({ message: 'Cannot delete your own admin account.' });
    }
    await pool.query('DELETE FROM "User" WHERE id = $1', [id]);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

// Get all ads
// FIX: Use explicit Response type from express to fix property errors.
export const getAds = async (req: AuthRequest, res: express.Response) => {
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

// Delete an ad
// FIX: Use explicit Response type from express to fix property errors.
export const deleteAd = async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM "Ad" WHERE id = $1', [id]);
    res.status(200).json({ message: 'Ad deleted successfully' });
  } catch (error) {
    console.error('Admin delete ad error:', error);
    res.status(500).json({ message: 'Failed to delete ad' });
  }
};