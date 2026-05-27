const express = require('express');
const axios = require('axios');
const app = express();

// Render сам выдает порт через переменную окружения, если её нет — ставим 3000
const PORT = process.env.PORT || 3000;

// ТВОЙ СПИСОК ГИФОК (Заменяй и добавляй сколько хочешь)
const GIF_LIST = [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbWdtcmc3b2E0M3B3Ym95bHh0bWNtOHg0czN6NXA0Z3d6bms4ZXFwOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/VbnUQirBP0vG8/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbTN0Ym15cm1wZnd0amM0bW5icXNndnl1YW96Nmw0YmZ1M240bWcxdyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/BcMJcx2fGtLWEXMQv5/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Z4bTNvcm00Mm93bXp5ZDJ5b3RnaDdrMmR3ZXB4MXZid3FmZnR0MSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/cuw765T66ID6g/giphy.gif',
    'https://media.giphy.com/media/c6r0v9E_BofqE/giphy.gif'
];

app.get('/fun', async (req, res) => {
    try {
        // Жесткие заголовки, чтобы Discord вообще не думал кешировать
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Content-Type', 'image/gif');

        // Выбираем случайную гифку из списка
        const randomIndex = Math.floor(Math.random() * GIF_LIST.length);
        const targetUrl = GIF_LIST[randomIndex];

        console.log(`[Запрос] Выбрана рандомная гифка: ${targetUrl}`);

        // Качаем гифку по ссылке и стримим её в ответ Discord
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream'
        });

        response.data.pipe(res);

    } catch (error) {
        console.error('Ошибка стриминга гифки:', error.message);
        // Если что-то сломалось, отдаем 500 ошибку, чтобы Discord не сломал интерфейс юзеру
        res.status(500).send('Error loading image');
    }
});

app.listen(PORT, () => {
    console.log(`Сервер успешно запущен на порту ${PORT}`);
});