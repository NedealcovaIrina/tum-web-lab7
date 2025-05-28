// server.js

// Импортируем необходимые модули
const express = require('express'); // Express.js для создания веб-сервера
const cors = require('cors');       // CORS для разрешения кросс-доменных запросов
const jwt = require('jsonwebtoken'); // jsonwebtoken для работы с JWT
require('dotenv').config();         // dotenv для загрузки переменных окружения из .env файла

// Создаем экземпляр приложения Express
const app = express();
// Определяем порт, используя переменную окружения или значение по умолчанию 3000
const PORT = process.env.PORT || 3000;

// Получаем секретный ключ JWT из переменных окружения.
// ВНИМАНИЕ: В продакшене JWT_SECRET ДОЛЖЕН быть установлен как переменная окружения
// и быть очень сложным и случайным. Запасной ключ здесь только для удобства разработки.
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_here_make_it_long_and_random';

// --- Middleware ---
// Разрешаем CORS для всех доменов. В продакшене лучше ограничить список разрешенных доменов.
app.use(cors());
// Разрешаем Express парсить JSON-тела входящих запросов
app.use(express.json());

// --- Наша "фиктивная" база данных для желаний ---
// Это простой массив объектов, имитирующий базу данных.
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

// Генератор следующего ID для новых желаний
// Если массив пуст, начинаем с 1, иначе берем максимальный ID и прибавляем 1.
let nextWishId = wishes.length > 0 ? Math.max(...wishes.map(w => w.id)) + 1 : 1;

// --- Базовый маршрут ---
// Простой тестовый маршрут, доступный без аутентификации
app.get('/', (req, res) => {
  res.send('Welcome to the Wishlist Backend API!');
});

// --- Эндпоинт для получения JWT ---
// Маршрут: POST /token
// Этот эндпоинт не требует аутентификации, так как его цель - получить токен.
// Принимает username и password в теле запроса.
// Для демо-целей, мы используем простые жестко закодированные учетные данные.
app.post('/token', (req, res) => {
  const { username, password } = req.body;

  let userRole = 'VISITOR'; // Роль по умолчанию
  let userPermissions = ['READ']; // Разрешения по умолчанию

  // Простая имитация проверки учетных данных и назначения ролей/разрешений
  if (username === 'admin' && password === 'adminpass') {
    userRole = 'ADMIN';
    userPermissions = ['READ', 'WRITE', 'DELETE']; // Администратор может все
  } else if (username === 'writer' && password === 'writerpass') {
    userRole = 'WRITER';
    userPermissions = ['READ', 'WRITE']; // Писатель может читать и писать
  } else if (username === 'visitor' && password === 'visitorpass') {
    userRole = 'VISITOR';
    userPermissions = ['READ']; // Посетитель может только читать
  } else {
    // Если учетные данные неверны, возвращаем 401 Unauthorized
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Создаем JWT payload (данные, которые будут закодированы в токене)
  const payload = {
    username: username,
    role: userRole,
    permissions: userPermissions
  };

  // Создаем (подписываем) JWT
  // expiresIn: '1m' - токен истечет через 1 минуту (для демонстрации)
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1m' });

  // Отправляем сгенерированный токен клиенту
  res.status(200).json({ token: token });
});

// --- JWT Authentication Middleware ---
// Эта функция будет выполняться перед каждым защищенным маршрутом.
// Она проверяет наличие и валидность JWT.
const authenticateToken = (req, res, next) => {
  // Получаем заголовок Authorization из HTTP-запроса
  // Формат ожидается: "Bearer YOUR_JWT_TOKEN"
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Извлекаем сам токен

  // Если токена нет в заголовке, возвращаем 401 Unauthorized
  if (token == null) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  // Проверяем токен с помощью секретного ключа
  jwt.verify(token, JWT_SECRET, (err, user) => {
    // Если произошла ошибка при проверке (например, токен недействителен, истек, подделан)
    if (err) {
      // Можно логировать err для дебага: console.error('JWT verification error:', err);
      return res.status(403).json({ message: 'Invalid or expired token' }); // 403 Forbidden
    }
    // Если токен действителен, сохраняем расшифрованные данные пользователя (из payload)
    // в объекте req.user. Это делает данные пользователя доступными для всех последующих
    // обработчиков маршрута.
    req.user = user;
    next(); // Переходим к следующему middleware или обработчику маршрута
  });
};

// --- Authorization Middleware (проверка разрешений) ---
// Эта функция возвращает другой middleware, который проверяет,
// есть ли у пользователя необходимые разрешения.
const authorizePermission = (requiredPermissions) => {
  return (req, res, next) => {
    // Сначала убеждаемся, что данные пользователя из токена доступны
    if (!req.user || !req.user.permissions) {
      return res.status(403).json({ message: 'Access denied: No permissions found in token' });
    }

    // Проверяем, есть ли у пользователя хотя бы одно из требуемых разрешений
    const hasPermission = requiredPermissions.some(permission =>
      req.user.permissions.includes(permission)
    );

    // Если у пользователя есть необходимое разрешение, продолжаем
    if (hasPermission) {
      next();
    } else {
      // Иначе возвращаем 403 Forbidden
      res.status(403).json({ message: 'Access denied: Insufficient permissions' });
    }
  };
};

// --- Защищенные CRUD-эндпоинты для желаний ---
// Применяем middleware authenticateToken и authorizePermission к каждому маршруту.

// GET all wishes (требует токен и разрешение 'READ')
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

// GET a single wish by ID (требует токен и разрешение 'READ')
app.get('/api/wishes/:id', authenticateToken, authorizePermission(['READ']), (req, res) => {
  const id = parseInt(req.params.id);
  const wish = wishes.find(w => w.id === id);

  if (wish) {
    res.status(200).json(wish);
  } else {
    res.status(404).json({ message: 'Wish not found' });
  }
});

// POST (Create) a new wish (требует токен и разрешение 'WRITE')
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

  wishes.unshift(newWish); // Добавляем в начало для "newest" сортировки
  res.status(201).json(newWish);
});

// PUT (Update) an existing wish (требует токен и разрешение 'WRITE')
app.put('/api/wishes/:id', authenticateToken, authorizePermission(['WRITE']), (req, res) => {
  const id = parseInt(req.params.id);
  const wishIndex = wishes.findIndex(w => w.id === id);

  if (wishIndex === -1) {
    return res.status(404).json({ message: 'Wish not found' });
  }

  // Обновляем только предоставленные поля, сохраняя существующие
  wishes[wishIndex] = { ...wishes[wishIndex], ...req.body, id: id };
  res.status(200).json(wishes[wishIndex]);
});

// DELETE a wish (требует токен и разрешение 'DELETE')
// Обычно 'DELETE' доступен только для администраторов.
app.delete('/api/wishes/:id', authenticateToken, authorizePermission(['DELETE']), (req, res) => {
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
  console.log(`Remember to include 'Authorization: Bearer YOUR_TOKEN' header for protected routes.`);
});

