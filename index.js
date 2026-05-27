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

app.get('/fun.gif', (req, res) => {
    try {
        // Заголовки от кэша (на всякий случай оставляем)
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        if (gifList.length === 0) {
            return res.status(404).send('Gif list is empty');
        }

        // Выбираем рандомную гифку из списка памяти
        const randomIndex = Math.floor(Math.random() * gifList.length);
        const targetUrl = gifList[randomIndex];

        // Генерируем уникальный хвост времени
        const separator = targetUrl.includes('?') ? '&' : '?';
        const finalUrl = `${targetUrl}${separator}discord_bust=${Date.now()}`;

        console.log(`[Редирект] Перенаправляем Discord на: ${finalUrl}`);

        // Делаем временный редирект (302). Discord обязан пойти по нему.
        res.redirect(302, finalUrl);

    } catch (error) {
        console.error('Ошибка редиректа:', error.message);
        res.status(500).send('Error');
    }
});

app.listen(PORT, () => {
    console.log(`Сервер пашет на порту ${PORT}`);
});