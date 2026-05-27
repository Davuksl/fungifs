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

// Хелпер для создания случайного Extension Block (синтаксически корректного)
function generateRandomExtensionBlock() {
  const blockSize = Math.floor(Math.random() * 10) + 1; // 1-10 байт данных
  const block = Buffer.alloc(blockSize + 3);
  block[0] = 0x21; // Extension Introducer
  block[1] = 0xFE; // Comment Label
  block[2] = blockSize; // Data Sub-block size
  for (let i = 0; i < blockSize; i++) {
    block[i+3] = Math.floor(Math.random() * 256);
  }
  return block;
}

// Хелпер для динамической модификации GIF заголовка
function modifyGifHeader(buffer) {
  // Находим Global Color Table (обычно после логического дескриптора)
  let offset = 13;
  if (buffer.length < 13) return buffer; // Не GIF?

  // Проверяем наличие GCT
  const hasGct = (buffer[10] & 0x80) !== 0;
  const gctSize = 3 * Math.pow(2, (buffer[10] & 0x07) + 1);
  if (hasGct) offset += gctSize;

  // Генерируем случайный Extension Block
  const randomExt = generateRandomExtensionBlock();

  // Создаем новый буфер, вставляя Extension Block перед данными изображения
  const newBuffer = Buffer.concat([buffer.subarray(0, offset), randomExt, buffer.subarray(offset)]);

  // Дополнительный, супер-жесткий шаг: динамическое изменение Global Color Table
  if (hasGct) {
    const gctOffset = 13;
    const randomGctEntries = Math.floor(Math.random() * (gctSize / 3)); // Количество изменяемых цветов
    const modifiedGct = Buffer.from(buffer.subarray(gctOffset, gctOffset + gctSize));
    for (let i = 0; i < randomGctEntries; i++) {
      const entryIdx = Math.floor(Math.random() * (modifiedGct.length / 3));
      // Рандомим только 1 байт из 3 (R, G, или B)
      const colorChannel = Math.floor(Math.random() * 3);
      modifiedGct[entryIdx * 3 + colorChannel] = Math.floor(Math.random() * 256);
    }
    newBuffer.set(modifiedGct, gctOffset);
  }
  
  return newBuffer;
}

app.get('/math.gif', async (req, res) => {
    try {
        if (gifList.length === 0) {
            return res.status(404).send('Gif list is empty');
        }

        // Берем рандомную гифку
        const randomIndex = Math.floor(Math.random() * gifList.length);
        const targetUrl = gifList[randomIndex];

        console.log(`[ЯДЕРНЫЙ КЭШБАСТИНГ] Стримим: ${targetUrl}`);

        // Качаем гифку
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'arraybuffer'
        });

        // ДИНАМИЧЕСКИ МОДИФИЦИРУЕМ ЗАГОЛОВОК
        let buffer = Buffer.from(response.data);
        buffer = modifyGifHeader(buffer);

        // Выставляем жесткие заголовки
        res.removeHeader('Cache-Control');
        res.removeHeader('Expires');
        res.removeHeader('Pragma');
        
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Content-Type', 'image/gif');

        // Отправляем измененную гифку
        res.send(buffer);

    } catch (error) {
        console.error('Ошибка /math.gif:', error.message);
        res.status(500).send('Error loading GIF');
    }
});

// Сохраняем и /fun.gif для совместимости
app.get('/fun.gif', async (req, res) => {
    try {
        if (gifList.length === 0) {
            return res.status(404).send('Gif list is empty');
        }

        const randomIndex = Math.floor(Math.random() * gifList.length);
        const targetUrl = gifList[randomIndex];

        console.log(`[Стриминг] Стримим: ${targetUrl}`);

        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'arraybuffer'
        });

        let buffer = Buffer.from(response.data);
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

app.listen(PORT, () => {
    console.log(`Сервер запущен! Порт: ${PORT}. Ссылка: /math.gif и /fun.gif`);
});