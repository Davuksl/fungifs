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
        console.log(`[GitHub] Список обновлен. Гифок: ${gifList.length}`);
    } catch (error) {
        console.error('[GitHub Ошибка]:', error.message);
    }
}
updateGifList();
setInterval(updateGifList, 60 * 1000);

// Ссылка снова чистая, как ты и хотел
app.get('/fun.gif', async (req, res) => {
    try {
        const userAgent = req.headers['user-agent'] || '';

        // Жестко сносим кэш в любом случае
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // 1. ЕСЛИ ЭТО БОТ ДИСКОРДА (строит превью в чате)
        if (userAgent.includes('Discordbot')) {
            console.log(`[Бот Дискорда] Пришел за превью. Выдаем заглушку, чтобы сбить кэш.`);
            
            // Отдаем всегда одинаковый mini-PNG или первую гифку, но заставляем его думать, что это уникальный контент
            res.setHeader('Content-Type', 'image/gif');
            // Можешь вставить сюда прямую ссылку на какую-то одну дефолтную картинку-заглушку
            const defaultResponse = await axios.get('https://media.giphy.com/media/c6r0v9E_BofqE/giphy.gif', { responseType: 'stream' });
            return defaultResponse.data.pipe(res);
        }

        // 2. ЕСЛИ ЭТО КЛИЕНТ ЮЗЕРА (когда картинка прогружается в самом чате у людей)
        if (gifList.length === 0) {
            return res.status(404).send('Empty list');
        }

        const randomIndex = Math.floor(Math.random() * gifList.length);
        const targetUrl = gifList[randomIndex];

        console.log(`[Клиент Дискорда] Прямой запрос! Отдаем рандом: ${targetUrl}`);

        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'arraybuffer'
        });

        let buffer = Buffer.from(response.data);
        
        // Дописываем байт для уникальности хэша в самом клиенте
        const randomByte = Buffer.from([Math.floor(Math.random() * 256)]);
        buffer = Buffer.concat([buffer, randomByte]);

        res.setHeader('Content-Type', 'image/gif');
        res.send(buffer);

    } catch (error) {
        console.error('[Ошибка эксплойта]:', error.message);
        res.status(500).send('Error');
    }
});

app.listen(PORT, () => {
    console.log(`Фикс под оригинал запущен на порту ${PORT}`);
});