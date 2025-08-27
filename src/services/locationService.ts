import axios from 'axios';
import pool from '../db.js';

interface GeoLocationResponse {
    status: string;
    city?: string;
    lat?: number;
    lon?: number;
}

/**
 * Fetches geolocation data for a given IP address and updates the user record.
 * @param ip The user's IP address.
 * @param userId The ID of the user to update.
 */
export const updateLocationFromIp = async (ip: string, userId: string): Promise<void> => {
    // Skip for local/internal IPs
    if (!ip || ip === '::1' || ip === '127.0.0.1') {
        return;
    }

    try {
        const response = await axios.get<GeoLocationResponse>(`http://ip-api.com/json/${ip}`);
        const { data } = response;

        if (data.status === 'success' && data.lat && data.lon && data.city) {
            await pool.query(
                'UPDATE "User" SET latitude = $1, longitude = $2, city = $3 WHERE id = $4',
                [data.lat, data.lon, data.city, userId]
            );
            console.log(`Updated location for user ${userId} to ${data.city}`);
        }
    } catch (error) {
        // Log the error but don't let it crash the auth flow
        console.error(`Could not fetch geolocation for IP ${ip}:`, error);
    }
};
