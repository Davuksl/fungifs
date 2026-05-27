const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;
const BASE_LIST_URL = 'https://raw.githubusercontent.com/Davuksl/giflist/main/list.txt';

let gifList = [];

// Каждую минуту качаем свежий список с гитхаба
async function updateGifList() {
    try {
        const cacheBusterUrl = `${BASE_LIST_URL}?t=${Date.now()}`;
        console.log(`Обновляем список гифок с GitHub...`);
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

updateGifList();
setInterval(updateGifList, 60 * 1000);

// Ссылка строго /fun.gif, как ты и просил
app.get('/fun.gif', async (req, res) => {
    try {
        if (gifList.length === 0) {
            return res.status(404).send('Gif list is empty');
        }

        // Берем рандомную гифку из списка
        const randomIndex = Math.floor(Math.random() * gifList.length);
        const targetUrl = gifList[randomIndex];

        console.log(`[Запрос] Стримим гифку: ${targetUrl}`);

        // Качаем гифку как Buffer (набор байт), а не как Stream
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'arraybuffer' // работаем с бинарником напрямую
        });

        let buffer = Buffer.from(response.data);
        const randomByte = Buffer.from([Math.floor(Math.random() * 256)]);
        buffer = Buffer.concat([buffer, randomByte]);

        // Выставляем жесткие заголовки со скрина
        res.removeHeader('Cache-Control');
        res.removeHeader('Expires');
        res.removeHeader('Pragma');
        
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Content-Type', 'image/gif');

        // Отправляем измененную гифку в Discord
        res.send(buffer);

    } catch (error) {
        console.error('Ошибка при стриминге гифки:', error.message);
        res.status(500).send('Error loading GIF');
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}. Ссылка: /fun.gif`);
});