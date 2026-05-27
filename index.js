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

        console.log(`[GitHub] Список обновлен! Гифок: ${gifList.length}`);
    } catch (error) {
        console.error('[Ошибка] Не удалось загрузить список:', error.message);
        if (gifList.length === 0) {
            gifList = ['https://media.giphy.com/media/c6r0v9E_BofqE/giphy.gif'];
        }
    }
}

updateGifList();
setInterval(updateGifList, 60 * 1000);

app.get('/fun.gif', async (req, res) => {
    try {
        if (gifList.length === 0) {
            return res.status(404).send('Список пуст');
        }

        const randomIndex = Math.floor(Math.random() * gifList.length);
        const targetUrl = gifList[randomIndex];

        console.log(`[Запрос] Отдаем: ${targetUrl}`);

        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'arraybuffer'
        });

        let buffer = Buffer.from(response.data);

        // Старый добрый рабочий допис байта в конец
        const randomByte = Buffer.from([Math.floor(Math.random() * 256)]);
        buffer = Buffer.concat([buffer, randomByte]);

        // Сносим всё, что Express или Render могли наклеить автоматически
        res.removeHeader('Cache-Control');
        res.removeHeader('Expires');
        res.removeHeader('Pragma');
        res.removeHeader('ETag');
        res.removeHeader('Last-Modified');
        
        // Жестко запрещаем кэш
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // ИМИТАЦИЯ ПЕРЕЗАПУСКА: каждый запрос выдает новые маркеры времени создания файла
        const fakeTime = new Date().toUTCString();
        res.setHeader('Last-Modified', fakeTime);
        res.setHeader('ETag', `"${Date.now()}-${Math.floor(Math.random() * 10000)}"`); 

        res.setHeader('Content-Type', 'image/gif');
        res.send(buffer);

    } catch (error) {
        console.error('[Ошибка]:', error.message);
        res.status(500).send('Error');
    }
});

app.listen(PORT, () => {
    console.log(`Сервер пашет на порту ${PORT}`);
});