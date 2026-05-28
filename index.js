const express = require('express');
const axios = require('axios');
const { createCanvas } = require('canvas'); // Import createCanvas
const app = express();

const PORT = process.env.PORT || 3000;
const BASE_LIST_URL = process.env.GIF_LIST_URL || 'https://raw.githubusercontent.com/Davuksl/giflist/main/list.txt';
const UPDATE_INTERVAL = 60 * 1000; // 1 minute

let gifList = [];
let isInitialLoadComplete = false;
let lastServedGifIndex = -1; // Initialize with an invalid index

// Debate content for test.gif
const DEBATE_TOPICS = [
    { question: 'Какой цвет лучше?', answers: ['Синий!', 'Желтый!'] },
    { question: 'Результат 7 * 6?', answers: ['42', '15'] },
    { question: 'Кошки или собаки?', answers: ['Кошки!', 'Собаки!'] },
    { question: 'Ночь или день?', answers: ['Ночь.', 'День.'] },
    { question: 'Чай или кофе?', answers: ['Чай.', 'Кофе.'] },
];

/**
 * Generates a GIF buffer with a random debate question and answers.
 * @returns {Promise<Buffer>}
 */
async function generateDebateGifBuffer() {
    const width = 600;
    const height = 200;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#36393f'; // Discord dark theme background
    ctx.fillRect(0, 0, width, height);

    // Select a random debate topic
    const topic = DEBATE_TOPICS[Math.floor(Math.random() * DEBATE_TOPICS.length)];

    ctx.font = 'bold 30px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(topic.question, width / 2, 50);

    // Draw two conflicting answers
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7289da'; // Discord blue
    ctx.fillText(topic.answers[0], width / 4, 120);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#f04747'; // Discord red
    ctx.fillText(topic.answers[1], (width / 4) * 3, 120);
    
    ctx.textAlign = 'center';
    ctx.fillStyle = '#99aab5'; // Discord grey
    ctx.font = '18px Arial';
    ctx.fillText('Каждый раз по-разному!', width / 2, 170);

    // Append a random byte to ensure uniqueness for Discord caching
    const buffer = canvas.toBuffer('image/gif');
    const randomByte = Buffer.from([Math.floor(Math.random() * 256)]);
    return Buffer.concat([buffer, randomByte]);
}

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

    // This route is specifically for Discordbot after a redirect, so we know it's a Discordbot
    await serveRandomGif(req, res, true);
});

// Route for test.gif - handles direct user requests and redirects Discord bots
app.get('/test.gif', async (req, res) => {
    const userAgent = req.headers['user-agent'] || '';
    const isDiscordBot = userAgent.includes('Discordbot');

    if (isDiscordBot) { // If it's a Discord bot, always redirect to a unique URL
        const uniqueProxyTestUrl = `/proxy-test-gif/${Date.now()}`;
        console.log(`[Discord Bot] Redirecting test.gif to unique proxy URL: ${uniqueProxyTestUrl}`);
        res.redirect(302, uniqueProxyTestUrl);
        return;
    }

    // For regular user clients, generate and serve the test GIF directly
    try {
        const gifBuffer = await generateDebateGifBuffer();
        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.send(gifBuffer);
    } catch (error) {
        console.error('[Test GIF Serving Error]:', error.message);
        res.status(500).send('Failed to generate test GIF.');
    }
});

// New route to handle redirected Discordbot requests for /test.gif
app.get('/proxy-test-gif/:timestamp', async (req, res) => {
    // This route is specifically for Discordbot after a redirect for test.gif
    try {
        const gifBuffer = await generateDebateGifBuffer();
        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.send(gifBuffer);
    } catch (error) {
        console.error('[Test GIF Serving Error]:', error.message);
        res.status(500).send('Failed to generate test GIF.');
    }
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

