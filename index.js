const express = require('express');
const axios = require('axios');
const { createCanvas } = require('canvas'); // Для генерации матана на лету
const app = express();

const PORT = process.env.PORT || 3000;
const BASE_LIST_URL = 'https://raw.githubusercontent.com/Davuksl/giflist/main/list.txt';

let gifList = [];

// Каждую минуту качаем свежий список с гитхаба для /fun.gif
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

// --- МАРШРУТ 1: ТВОИ РАНДОМНЫЕ ГИФКИ ---
app.get('/fun.gif', async (req, res) => {
    try {
        if (gifList.length === 0) {
            return res.status(404).send('Gif list is empty');
        }

        const randomIndex = Math.floor(Math.random() * gifList.length);
        const targetUrl = gifList[randomIndex];

        console.log(`[Запрос /fun.gif] Стримим: ${targetUrl}`);

        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'arraybuffer'
        });

        let buffer = Buffer.from(response.data);

        // Анти-кэш: дописываем рандомный байт в конец гифки
        const randomByte = Buffer.from([Math.floor(Math.random() * 256)]);
        buffer = Buffer.concat([buffer, randomByte]);

        res.removeHeader('Cache-Control');
        res.removeHeader('Expires');
        res.removeHeader('Pragma');
        
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Content-Type', 'image/gif');

        res.send(buffer);

    } catch (error) {
        console.error('Ошибка /fun.gif:', error.message);
        res.status(500).send('Error loading GIF');
    }
});

// --- МАРШРУТ 2: МАТЕМАТИЧЕСКИЙ ЧЕЛЛЕНДЖ (ТОЖЕ .GIF) ---
app.get('/math.gif', (req, res) => {
    try {
        res.removeHeader('Cache-Control');
        res.removeHeader('Expires');
        res.removeHeader('Pragma');

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Указываем тип image/gif, Дискорд схавает canvas-поток как гифку из 1 кадра
        res.setHeader('Content-Type', 'image/gif'); 

        const canvas = createCanvas(450, 135);
        const ctx = canvas.getContext('2d');

        // Белый фон
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 450, 135);

        // Заголовок
        ctx.fillStyle = '#000000';
        ctx.font = '24px Impact';
        ctx.textAlign = 'center';
        ctx.fillText('Math challenge (99% fail):', 225, 35);

        // Генерация примера
        const num_a = Math.floor(Math.random() * (6 - 2 + 1)) + 2; 
        const random_multiplier = Math.floor(Math.random() * (12 - 3 + 1)) + 3; 
        const num_b = random_multiplier * num_a;
        const num_c = Math.floor(Math.random() * (24 - 3 + 1)) + 3; 

        ctx.font = '48px Impact';
        const expression = `${num_b} / ${num_a} + ${num_c}`;
        ctx.fillText(expression, 225, 95);

        console.log(`[Запрос /math.gif] Сгенерирован пример: ${expression}`);

        // Стримим в ответ
        const stream = canvas.createPNGStream(); // Canvas выдает PNG поток, но благодаря заголовку Content-Type: image/gif Дискорд обработает его корректно
        stream.pipe(res);

    } catch (error) {
        console.error('Ошибка /math.gif:', error.message);
        res.status(500).send('Error generating math');
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен! Порт: ${PORT}`);
    console.log(`Доступно: /fun.gif и /math.gif`);
});