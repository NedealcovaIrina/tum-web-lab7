// server.js

// Импортируем модуль Express
const express = require('express');

// Создаем экземпляр приложения Express
const app = express();

// Определяем порт, на котором будет работать наш сервер.
// Используем переменную окружения PORT, если она задана (для деплоя),
// иначе по умолчанию используем порт 3000.
const PORT = process.env.PORT || 3000;

// Middleware для обработки JSON-запросов.
// Это позволит Express автоматически парсить JSON-тела входящих запросов.
app.use(express.json());

// Определяем базовый маршрут (endpoint) для нашего API.
// Когда кто-то делает GET-запрос к корневому пути '/',
// сервер ответит сообщением "Hello, Backend!".
app.get('/', (req, res) => {
  res.send('Hello, Backend!');
});

// Запускаем сервер и начинаем слушать входящие запросы на определенном порту.
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open your browser at http://localhost:${PORT}`);
});

