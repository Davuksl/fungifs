const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;
const BASE_LIST_URL = 'https://raw.githubusercontent.com/Davuksl/giflist/main/list.txt';

let gifList = [];

async function updateGifList() {
    try {
        // Добавляем к ссылке текущее время в миллисекундах (например, ?t=1716843421000)
        // Это обнуляет кэш GitHub, и он ОБЯЗАН отдать свежий файл
        const cacheBusterUrl = `${BASE_LIST_URL}?t=${Date.now()}`;
        
        console.log(`Обновляем список гифок с GitHub (без кэша)...`);
        const response = await axios.get(cacheBusterUrl);
        
        gifList = response.data
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && (line.startsWith('http://') || line.startsWith('https://')));

        console.log(`[УСПЕХ] Список обновлен! Найдено гифок: ${gifList.length}`);
    } catch (error) {
        console.error('Не удалось загрузить список гифок:', error.message);
        if (gifList.length === 0) {
            gifList = ['https://media.giphy.com/media/c6r0v9E_BofqE/giphy.gif'];
        }
    }
}

// Стартовый запуск
updateGifList();

// Проверка каждую минуту
setInterval(updateGifList, 60 * 1000);

app.get('/fun.gif', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Content-Type', 'image/gif');

        if (gifList.length === 0) {
            return res.status(404).send('Gif list is empty');
        }

        const randomIndex = Math.floor(Math.random() * gifList.length);
        const targetUrl = gifList[randomIndex];

        console.log(`[Запрос] Стримим: ${targetUrl}`);

        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream'
        });

        response.data.pipe(res);

    } catch (error) {
        console.error('Ошибка при стриминге гифки:', error.message);
        res.status(500).send('Error loading GIF');
    }
});

app.listen(PORT, () => {
    console.log(`Сервер пашет на порту ${PORT}`);
});