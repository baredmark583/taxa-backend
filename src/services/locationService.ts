
import axios from 'axios';
import { query } from '../db.js';
import { log } from '../utils/logger.js';

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
export const updateLocationFromIp = async (ip: string | undefined, userId: string): Promise<void> => {
    const CONTEXT = `locationService(${userId})`;
    
    // Skip for local/internal IPs
    if (!ip || ip === '::1' || ip === '127.0.0.1') {
        log.debug(CONTEXT, 'Skipping location update for local IP.', { ip });
        return;
    }

    try {
        log.info(CONTEXT, 'Fetching geolocation for IP.', { ip });
        const response = await axios.get<GeoLocationResponse>(`http://ip-api.com/json/${ip}`);
        const { data } = response;
        log.debug(CONTEXT, 'Received response from geo IP API.', { data });

        if (data.status === 'success' && data.lat && data.lon && data.city) {
            await query(
                'UPDATE "User" SET latitude = $1, longitude = $2, city = $3 WHERE id = $4',
                [data.lat, data.lon, data.city, userId]
            );
            log.info(CONTEXT, `Successfully updated location for user to ${data.city}.`);
        } else {
            log.info(CONTEXT, 'Geo IP API response was not successful or missing data.', { status: data.status });
        }
    } catch (error) {
        // Log the error but don't let it crash the auth flow
        log.error(CONTEXT, `Could not fetch or update geolocation for IP ${ip}.`, error);
    }
};
