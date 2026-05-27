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
updatePhotoList(); // Используем твою функцию обновления списка фонов/гифок
updateGifList();
setInterval(updateGifList, 60 * 1000);

app.get('/fun.gif', async (req, res) => {
    try {
        const userAgent = req.headers['user-agent'] || '';

        // Жестко сносим кэш заголовками
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        if (gifList.length === 0) {
            return res.status(404).send('Empty list');
        }

        // 1. ЕСЛИ ЭТО БОТ ДИСКОРДА (пришел построить превью в чате)
        if (userAgent.includes('Discordbot')) {
            // Выбираем абсолютно случайную гифку для превью
            const randomIndex = Math.floor(Math.random() * gifList.length);
            const targetUrl = gifList[randomIndex];
            
            console.log(`[Бот Дискорда] Генерируем рандомное превью: ${targetUrl}`);
            
            const response = await axios({
                method: 'get',
                url: targetUrl,
                responseType: 'arraybuffer' // Качаем как буфер, чтобы сломать хэш бота
            });

            let buffer = Buffer.from(response.data);
            
            // Анти-кэш для бота: пихаем случайный байт в хвост файла
            const randomByte = Buffer.from([Math.floor(Math.random() * 256)]);
            buffer = Buffer.concat([buffer, randomByte]);

            res.setHeader('Content-Type', 'image/gif');
            return res.send(buffer);
        }

        // 2. ЕСЛИ ЭТО КЛИЕНТ ЮЗЕРА (прямая прогрузка у людей в клиенте)
        const randomIndex = Math.floor(Math.random() * gifList.length);
        const targetUrl = gifList[randomIndex];

        console.log(`[Клиент Юзера] Прямой запрос! Отдаем рандом: ${targetUrl}`);

        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'arraybuffer'
        });

        let buffer = Buffer.from(response.data);
        
        // Анти-кэш для юзера
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
    console.log(`Фикс под оригинал с рандомным превью запущен на порту ${PORT}`);
});
