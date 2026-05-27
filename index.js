const express = require('express');
const axios = require('axios');
const app = express();

// Render сам выдает порт через переменную окружения, если её нет — ставим 3000
const PORT = process.env.PORT || 3000;

// ТВОЙ СПИСОК ГИФОК (Заменяй и добавляй сколько хочешь)
const GIF_LIST = [
    'https://media.tenor.com/br_4g6mIWvIAAAAM/89squad-bratishkinoff.gif',
    'https://tenor.com/search/89squad-gifs',
    'https://media.tenor.com/9MJee27fZrIAAAAM/89squad-bratishkinoff.gif',
    'https://media.tenor.com/mp7djv8-ia0AAAAM/kier-bigbrotheriswatching.gif'
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