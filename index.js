const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;
const BASE_LIST_URL = 'https://raw.githubusercontent.com/Davuksl/giflist/main/list.txt';

let gifList = [];

async function updateGifList() {
    try {
        const cacheBusterUrl = `${BASE_LIST_URL}?t=${Date.now()}`;
        const response = await axios.get(cacheBusterUrl);
        gifList = response.data
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && (line.startsWith('http://') || line.startsWith('https://')));
        console.log(`[GitHub] Список обновлен. Всего гифок: ${gifList.length}`);
    } catch (error) {
        console.error('[GitHub Ошибка]:', error.message);
    }
}
updateGifList();
setInterval(updateGifList, 60 * 1000);

// 1. Главная ссылка, которую ты кидаешь в чат
app.get('/fun.gif', (req, res) => {
    // Жестко запрещаем кэш для самой HTML-прослойки
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'text/html');

    // Генерируем уникальный хвост времени, который УБЬЕТ кэш Дискорда внутри эмбеда
    const timestamp = Date.now();
    
    // Отдаем HTML с Open Graph тегами. Дискорд прочитает это и построит превью
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta property="og:type" content="video.other">
        <meta property="og:image" content="https://${req.get('host')}/stream.gif?t=${timestamp}">
        <meta property="og:image:type" content="image/gif">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:image" content="https://${req.get('host')}/stream.gif?t=${timestamp}">
    </head>
    <body>
        <script>window.location.href = "https://${req.get('host')}/stream.gif?t=${timestamp}";</script>
    </body>
    </html>
    `;
    res.send(html);
});

// 2. Внутренний эндпоинт, куда Дискорд полезет за самой гифкой
app.get('/stream.gif', async (req, res) => {
    try {
        if (gifList.length === 0) {
            return res.status(404).send('Empty list');
        }

        // Рандомим гифку из списка
        const randomIndex = Math.floor(Math.random() * gifList.length);
        const targetUrl = gifList[randomIndex];

        console.log(`[Дискорд запросил медиа] Отдаем: ${targetUrl}`);

        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream'
        });

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Content-Type', 'image/gif');

        response.data.pipe(res);

    } catch (error) {
        console.error('[Ошибка стриминга]:', error.message);
        res.status(500).send('Error');
    }
});

app.listen(PORT, () => {
    console.log(`Ультимативный сервер запущен на порту ${PORT}`);
});