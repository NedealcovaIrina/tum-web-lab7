// server.js

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // Импортируем jsonwebtoken
require('dotenv').config(); // Загружаем переменные окружения из .env файла

const app = express();
const PORT = process.env.PORT || 3000;

// Получаем секретный ключ JWT из переменных окружения.
// Если переменная не установлена, используем запасной ключ (только для разработки!).
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_fallback_for_dev';

// Используем cors middleware.
app.use(cors());
app.use(express.json());

// --- Наша "фиктивная" база данных для желаний ---
let wishes = [
  { id: 1, text: 'New Gaming PC', liked: true, fulfilled: false },
  { id: 2, text: 'Trip to Japan', liked: false, fulfilled: false },
  { id: 3, text: 'Learn to play guitar', liked: true, fulfilled: true },
  { id: 4, text: 'Read 50 books this year', liked: false, fulfilled: false },
  { id: 5, text: 'Visit Grand Canyon', liked: true, fulfilled: false },
  { id: 6, text: 'Buy a drone', liked: false, fulfilled: false },
  { id: 7, text: 'Run a marathon', liked: true, fulfilled: false },
  { id: 8, text: 'Master React development', liked: false, fulfilled: false },
  { id: 9, text: 'Cook a gourmet meal', liked: true, fulfilled: true },
  { id: 10, text: 'Learn a new language', liked: false, fulfilled: false },
];
let nextWishId = wishes.length > 0 ? Math.max(...wishes.map(w => w.id)) + 1 : 1;

// --- Базовый маршрут ---
app.get('/', (req, res) => {
  res.send('Welcome to the Wishlist Backend API!');
});

// --- Эндпоинт для получения JWT ---
// Маршрут: POST /token (или /login)
// Тело запроса: { username: "...", password: "..." }
// Для простоты, мы будем проверять только username.
// В реальном приложении здесь была бы проверка пользователя в базе данных.
app.post('/token', (req, res) => {
  const { username, password } = req.body;

  // В реальном приложении:
  // 1. Проверить username и password в базе данных.
  // 2. Если учетные данные верны, получить роли/разрешения пользователя.

  // Для демо: Просто проверяем username.
  // Дадим разные роли в зависимости от username.
  let userRole = 'VISITOR';
  let userPermissions = ['READ']; // По умолчанию только чтение

  if (username === 'admin' && password === 'adminpass') {
    userRole = 'ADMIN';
    userPermissions = ['READ', 'WRITE', 'DELETE'];
  } else if (username === 'writer' && password === 'writerpass') {
    userRole = 'WRITER';
    userPermissions = ['READ', 'WRITE'];
  } else if (username === 'visitor' && password === 'visitorpass') {
    userRole = 'VISITOR';
    userPermissions = ['READ'];
  } else {
    // Если учетные данные неверны
    return res.status(401).json({ message: 'Invalid credentials' }); // 401 Unauthorized
  }

  // Создаем JWT payload (данные, которые будут храниться в токене)
  const payload = {
    username: username,
    role: userRole,
    permissions: userPermissions
  };

  // Создаем JWT
  // expiresIn: '1m' - токен истечет через 1 минуту (для демо)
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1m' });

  res.status(200).json({ token: token }); // Отправляем сгенерированный токен
});

// --- CRUD Operations for Wishes (пока без защиты) ---

// GET all wishes with pagination and search
app.get('/api/wishes', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
  const searchTerm = req.query.searchTerm ? req.query.searchTerm.toLowerCase() : '';

  if (limit < 0 || offset < 0) {
    return res.status(400).json({ message: 'Limit and offset must be non-negative.' });
  }

  let filteredWishes = wishes;
  if (searchTerm) {
    filteredWishes = wishes.filter(wish => wish.text.toLowerCase().includes(searchTerm));
  }

  const paginatedWishes = filteredWishes.slice(offset, offset + limit);

  res.status(200).json({
    total: filteredWishes.length,
    offset: offset,
    limit: limit,
    data: paginatedWishes
  });
});

// GET a single wish by ID
app.get('/api/wishes/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const wish = wishes.find(w => w.id === id);

  if (wish) {
    res.status(200).json(wish);
  } else {
    res.status(404).json({ message: 'Wish not found' });
  }
});

// POST (Create) a new wish
app.post('/api/wishes', (req, res) => {
  const { text, liked, fulfilled } = req.body;
  if (!text) {
    return res.status(400).json({ message: 'Wish text is required.' });
  }

  const newWish = {
    id: nextWishId++,
    text,
    liked: typeof liked === 'boolean' ? liked : false,
    fulfilled: typeof fulfilled === 'boolean' ? fulfilled : false,
  };

  wishes.unshift(newWish);
  res.status(201).json(newWish);
});

// PUT (Update) an existing wish
app.put('/api/wishes/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const wishIndex = wishes.findIndex(w => w.id === id);

  if (wishIndex === -1) {
    return res.status(404).json({ message: 'Wish not found' });
  }

  wishes[wishIndex] = { ...wishes[wishIndex], ...req.body, id: id };
  res.status(200).json(wishes[wishIndex]);
});

// DELETE a wish
app.delete('/api/wishes/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const initialLength = wishes.length;
  wishes = wishes.filter(wish => wish.id !== id);

  if (wishes.length < initialLength) {
    res.status(200).json({ message: 'Wish deleted successfully' });
  } else {
    res.status(404).json({ message: 'Wish not found' });
  }
});

// Запускаем сервер
app.listen(PORT, () => {
  console.log(`Wishlist Backend Server is running on port ${PORT}`);
  console.log(`Open your browser at http://localhost:${PORT}`);
  console.log(`Test API: http://localhost:${PORT}/api/wishes`);
  console.log(`Test token endpoint (POST): http://localhost:${PORT}/token`);
  console.log(`Use Postman/Insomnia for POST /token with { "username": "admin", "password": "adminpass" }`);
});

