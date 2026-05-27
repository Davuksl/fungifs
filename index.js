const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;
const LIST_URL = 'https://raw.githubusercontent.com/Davuksl/giflist/main/list.txt';

// Переменная для хранения списка гифок в памяти
let gifList = [];

// Функция для обновления списка гифок из GitHub
async function updateGifList() {
    try {
        console.log('Обновляем список гифок с GitHub...');
        const response = await axios.get(LIST_URL);
        
        // Разбиваем текст по строкам, убираем пустые строки и лишние пробелы/символы переноса (\r)
        gifList = response.data
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && (line.startsWith('http://') || line.startsWith('https://')));

        console.log(`Список успешно обновлен! Загружено гифок: ${gifList.length}`);
    } catch (error) {
        console.error('Не удалось загрузить список гифок:', error.message);
        // Если это первый запуск и массив пустой, добавим заглушку, чтобы сервер не падал
        if (gifList.length === 0) {
            gifList = ['https://media.giphy.com/media/c6r0v9E_BofqE/giphy.gif'];
        }
    }
}

// Запускаем первичное получение списка при старте сервера
updateGifList();

// Раз в 15 минут обновляем список (на случай, если ты добавишь новые ссылки в txt)
setInterval(updateGifList, 15 * 60 * 1000);

// Добавили .gif в эндпоинт. Теперь ссылка будет вида: https://твой-проект.onrender.com/fun.gif
app.get('/fun.gif', async (req, res) => {
    try {
        // Жесткие заголовки против кеширования Discord
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Content-Type', 'image/gif');

        if (gifList.length === 0) {
            return res.status(404).send('Gif list is empty');
        }

        // Выбираем случайную ссылку
        const randomIndex = Math.floor(Math.random() * gifList.length);
        const targetUrl = gifList[randomIndex];

        console.log(`[Запрос] Стримим рандомную гифку: ${targetUrl}`);

        // Скачиваем гифку по ссылке из txt и перенаправляем поток в Дискорд
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
    console.log(`Ссылка для Дискорда: http://localhost:${PORT}/fun.gif`);
});