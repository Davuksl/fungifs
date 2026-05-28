const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;
const BASE_LIST_URL = process.env.GIF_LIST_URL || 'https://raw.githubusercontent.com/Davuksl/giflist/main/list.txt';
const UPDATE_INTERVAL = 60 * 1000; // 1 minute

let gifList = [];
let isInitialLoadComplete = false;
let lastServedGifIndex = -1; // Initialize with an invalid index

/**
 * Fetches the GIF list from GitHub and updates the local cache.
 */
async function updateGifList() {
    try {
        const cacheBusterUrl = `${BASE_LIST_URL}?t=${Date.now()}`;
        const response = await axios.get(cacheBusterUrl, { timeout: 10000 });
        
        const newGifList = response.data
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && (line.startsWith('http://') || line.startsWith('https://')));

        if (newGifList.length > 0) {
            gifList = newGifList;
            console.log(`[GIF List] Updated. Count: ${gifList.length}`);
        } else {
            console.warn('[GIF List] Received an empty list from source.');
        }
    } catch (error) {
        console.error('[GIF List Error]:', error.message);
    } finally {
        isInitialLoadComplete = true;
    }
}

/**
 * Fetches a GIF from the given URL and appends a random byte to bypass caching.
 * @param {string} url 
 * @returns {Promise<Buffer>}
 */
async function fetchGifWithAntiCache(url) {
    const response = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
        timeout: 15000
    });

    const buffer = Buffer.from(response.data);
    const randomByte = Buffer.from([Math.floor(Math.random() * 256)]);
    return Buffer.concat([buffer, randomByte]);
}

async function serveRandomGif(req, res, isDiscordBot) {
    // Force headers to disable caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (!isInitialLoadComplete && gifList.length === 0) {
        return res.status(503).send('Service initializing...');
    }

    if (gifList.length === 0) {
        console.error('[Request Error] GIF list is empty.');
        return res.status(404).send('No GIFs available.');
    }

    try {
        let randomIndex = Math.floor(Math.random() * gifList.length);
        // Ensure the new GIF is not the same as the last one, if there are multiple GIFs available
        if (gifList.length > 1) {
            while (randomIndex === lastServedGifIndex) {
                randomIndex = Math.floor(Math.random() * gifList.length);
            }
        }
        const targetUrl = gifList[randomIndex];
        lastServedGifIndex = randomIndex; // Update the last served index

        const logPrefix = isDiscordBot ? '[Discord Bot]' : '[User Client]';
        console.log(`${logPrefix} Requesting random GIF: ${targetUrl}`);

        const gifBuffer = await fetchGifWithAntiCache(targetUrl);

        res.setHeader('Content-Type', 'image/gif');
        res.send(gifBuffer);
    } catch (error) {
        console.error('[GIF Serving Error]:', error.message);
        res.status(502).send('Failed to fetch GIF from source.');
    }
}

// Initial fetch and scheduled updates
updateGifList();
const updateInterval = setInterval(updateGifList, UPDATE_INTERVAL);

app.get('/fun.gif', async (req, res) => {
    const userAgent = req.headers['user-agent'] || '';
    const isDiscordBot = userAgent.includes('Discordbot');

    if (isDiscordBot) { // If it's a Discord bot, always redirect to a unique URL
        const uniqueProxyUrl = `/proxy-gif/${Date.now()}`;
        console.log(`[Discord Bot] Redirecting to unique proxy URL: ${uniqueProxyUrl}`);
        res.redirect(302, uniqueProxyUrl);
        return;
    }

    // For regular user clients, serve the GIF directly
    await serveRandomGif(req, res, false); // false because it's not a Discord bot request here
});

// New route to handle redirected Discordbot requests
app.get('/proxy-gif/:timestamp', async (req, res) => {
    // This route is specifically for Discordbot after a redirect, so we know it's a Discordbot
    await serveRandomGif(req, res, true);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        gifCount: gifList.length,
        initialized: isInitialLoadComplete
    });
});

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Source URL: ${BASE_LIST_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    clearInterval(updateInterval);
    server.close(() => {
        console.log('HTTP server closed');
    });
});

