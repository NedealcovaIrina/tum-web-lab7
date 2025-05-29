// server.js

// Подключаем модули
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Загружаем переменные окружения (.env)

// Подключаем Swagger для документации API
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json'); // Файл документации

const app = express();
const PORT = process.env.PORT || 3000;
// Секретный ключ для JWT (в проде использовать сложный из .env)
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_here_make_it_long_and_random';

// --- Middleware ---
app.use(cors()); // Разрешаем CORS
app.use(express.json()); // Парсим JSON в теле запросов

// --- Временная база данных желаний ---
// В реальном приложении тут будет настоящая БД
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
// Для новых желаний (уникальный ID)
let nextWishId = wishes.length > 0 ? Math.max(...wishes.map(w => w.id)) + 1 : 1;

// --- Middleware для проверки JWT ---
// Проверяем токен
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // Ожидаем формат "Bearer YOUR_TOKEN"
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // Ошибка верификации или истекший токен
      console.error('JWT verification error:', err.message);
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user; // Добавляем инфо о пользователе в запрос
    next(); // Продолжаем
  });
};

// --- Middleware для проверки разрешений ---
const authorizePermission = (requiredPermissions) => {
  return (req, res, next) => {
    // Если нет инфо о пользователе или разрешениях в токене
    if (!req.user || !req.user.permissions) {
      return res.status(403).json({ message: 'Access denied: No permissions found in token' });
    }

    // Проверяем наличие нужного разрешения
    const hasPermission = requiredPermissions.some(permission =>
      req.user.permissions.includes(permission)
    );

    if (hasPermission) {
      next(); // Разрешение есть
    } else {
      res.status(403).json({ message: 'Access denied: Insufficient permissions' });
    }
  };
};

// --- Маршрут для Swagger UI ---
// Доступно по /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// --- Базовый маршрут ---
// Проверка работы
app.get('/', (req, res) => {
  res.send('Welcome to the Wishlist Backend API!');
});

// --- Эндпоинт для получения токена ---
// Не требует авторизации
app.post('/api/token', (req, res) => {
  const { username, password } = req.body;

  let userRole = 'VISITOR';
  let userPermissions = ['READ']; // По умолчанию

  // Проверка учетных данных и назначение роли/разрешений
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
    // Неверные данные
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Payload для токена
  const payload = {
    username: username,
    role: userRole,
    permissions: userPermissions
  };

  // Генерируем токен (срок действия 1 час)
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

  // Отправляем токен
  res.status(200).json({ token: token });
});

// --- Защищенные CRUD эндпоинты для желаний ---

// Получить все желания (с пагинацией и поиском)
app.get('/api/wishes', authenticateToken, authorizePermission(['READ']), (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
  const searchTerm = req.query.searchTerm ? req.query.searchTerm.toLowerCase() : '';

  if (limit < 0 || offset < 0) {
    return res.status(400).json({ message: 'Limit and offset must be non-negative.' });
  }

  let filteredWishes = wishes;
  if (searchTerm) {
    filteredWishes = wishes.filter(wish =>
      wish.text.toLowerCase().includes(searchTerm)
    );
  }

  const paginatedWishes = filteredWishes.slice(offset, offset + limit);

  res.status(200).json({
    total: filteredWishes.length,
    offset: offset,
    limit: limit,
    data: paginatedWishes
  });
});

// Получить одно желание по ID
app.get('/api/wishes/:id', authenticateToken, authorizePermission(['READ']), (req, res) => {
  const id = parseInt(req.params.id);
  const wish = wishes.find(w => w.id === id);

  if (wish) {
    res.status(200).json(wish);
  } else {
    res.status(404).json({ message: 'Wish not found' });
  }
});

// Создать новое желание
app.post('/api/wishes', authenticateToken, authorizePermission(['WRITE']), (req, res) => {
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

  wishes.unshift(newWish); // Добавляем в начало списка
  res.status(201).json(newWish); // 201 Created
});

// Обновить существующее желание
app.put('/api/wishes/:id', authenticateToken, authorizePermission(['WRITE']), (req, res) => {
  const id = parseInt(req.params.id);
  const wishIndex = wishes.findIndex(w => w.id === id);

  if (wishIndex === -1) {
    return res.status(404).json({ message: 'Wish not found' });
  }

  // Обновляем данные желания
  wishes[wishIndex] = { ...wishes[wishIndex], ...req.body, id: id };
  res.status(200).json(wishes[wishIndex]);
});

// Удалить желание
app.delete('/api/wishes/:id', authenticateToken, authorizePermission(['DELETE']), (req, res) => {
  const id = parseInt(req.params.id);
  const initialLength = wishes.length;
  wishes = wishes.filter(wish => wish.id !== id); // Удаляем по ID

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
  console.log(`API Docs: http://localhost:${PORT}/api-docs`);
  console.log(`Test token endpoint (POST): http://localhost:${PORT}/api/token`);
  console.log(`Use Postman/Insomnia for POST /api/token with { "username": "admin", "password": "adminpass" }`);
  console.log(`Remember to include 'Authorization: Bearer YOUR_TOKEN' header for protected routes.`);
});