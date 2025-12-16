/**
 * Host Password Verification API
 *
 * POST: Verify if provided password matches HOST_PASSWORD env var
 */

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { password } = req.body;

        if (!password || typeof password !== 'string') {
            return res.status(400).json({ error: 'Password required' });
        }

        const hostPassword = process.env.HOST_PASSWORD;

        if (!hostPassword) {
            console.error('HOST_PASSWORD environment variable not set');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const isValid = password === hostPassword;

        return res.json({ valid: isValid });
    } catch (error) {
        console.error('Verify host error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
