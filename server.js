// server.js

const express = require('express');
const cors = require('cors'); // Импортируем пакет cors
const app = express();
const PORT = process.env.PORT || 3000; // Порт для бэкенда

// Используем cors middleware.
// Это позволит любому домену (origin) делать запросы к нашему API.
// В продакшене лучше ограничить список разрешенных доменов.
app.use(cors());

// Middleware для обработки JSON-запросов.
app.use(express.json());

// --- Наша "фиктивная" база данных для желаний (массив объектов) ---
// Структура данных соответствует тому, что ожидает твой фронтенд.
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
app.get('/', (req, res) => {
  res.send('Welcome to the Wishlist Backend API!');
});

// --- CRUD Operations for Wishes ---

// 1. GET all wishes with pagination and search
// Маршрут: GET /api/wishes
// Параметры запроса: limit, offset, searchTerm
app.get('/api/wishes', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
  const searchTerm = req.query.searchTerm ? req.query.searchTerm.toLowerCase() : '';

  if (limit < 0 || offset < 0) {
    return res.status(400).json({ message: 'Limit and offset must be non-negative.' });
  }

  let filteredWishes = wishes;

  // Если есть searchTerm, фильтруем желания по тексту
  if (searchTerm) {
    filteredWishes = wishes.filter(wish =>
      wish.text.toLowerCase().includes(searchTerm)
    );
  }

  // Применяем пагинацию к отфильтрованному списку
  const paginatedWishes = filteredWishes.slice(offset, offset + limit);

  res.status(200).json({
    total: filteredWishes.length, // Общее количество после фильтрации
    offset: offset,
    limit: limit,
    data: paginatedWishes
  });
});

// 2. GET a single wish by ID
// Маршрут: GET /api/wishes/:id
app.get('/api/wishes/:id', (req, res) => {
  const id = parseInt(req.params.id); // Получаем ID из URL-параметров
  const wish = wishes.find(w => w.id === id);

  if (wish) {
    res.status(200).json(wish); // Возвращаем желание, если найдено
  } else {
    res.status(404).json({ message: 'Wish not found' }); // 404 Not Found, если не найдено
  }
});

// 3. POST (Create) a new wish
// Маршрут: POST /api/wishes
// Тело запроса: { text: "...", liked: boolean, fulfilled: boolean }
app.post('/api/wishes', (req, res) => {
  const { text, liked, fulfilled } = req.body; // Получаем данные из тела запроса

  // Простая валидация: текст обязателен
  if (!text) {
    return res.status(400).json({ message: 'Wish text is required.' });
  }

  const newWish = {
    id: nextWishId++, // Присваиваем новый уникальный ID
    text,
    liked: typeof liked === 'boolean' ? liked : false, // Устанавливаем по умолчанию false, если не указано
    fulfilled: typeof fulfilled === 'boolean' ? fulfilled : false, // Устанавливаем по умолчанию false, если не указано
  };

  wishes.unshift(newWish); // Добавляем новое желание в начало массива (для "newest" сортировки)
  res.status(201).json(newWish); // 201 Created для успешного создания
});

// 4. PUT (Update) an existing wish
// Маршрут: PUT /api/wishes/:id
// Тело запроса: { text?: "...", liked?: boolean, fulfilled?: boolean }
app.put('/api/wishes/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const wishIndex = wishes.findIndex(w => w.id === id);

  if (wishIndex === -1) {
    return res.status(404).json({ message: 'Wish not found' }); // 404 Not Found
  }

  // Обновляем только те поля, которые пришли в теле запроса
  wishes[wishIndex] = { ...wishes[wishIndex], ...req.body, id: id }; // Важно: id не меняем
  res.status(200).json(wishes[wishIndex]); // 200 OK для успешного обновления
});

// 5. DELETE a wish
// Маршрут: DELETE /api/wishes/:id
app.delete('/api/wishes/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const initialLength = wishes.length;
  wishes = wishes.filter(wish => wish.id !== id); // Фильтруем, удаляя элемент с нужным ID

  if (wishes.length < initialLength) {
    res.status(200).json({ message: 'Wish deleted successfully' }); // 200 OK
  } else {
    res.status(404).json({ message: 'Wish not found' }); // 404 Not Found
  }
});


// Запускаем сервер
app.listen(PORT, () => {
  console.log(`Wishlist Backend Server is running on port ${PORT}`);
  console.log(`Open your browser at http://localhost:${PORT}`);
  console.log(`Test API: http://localhost:${PORT}/api/wishes`);
  console.log(`Test pagination: http://localhost:${PORT}/api/wishes?limit=5&offset=2`);
  console.log(`Test search: http://localhost:${PORT}/api/wishes?searchTerm=trip`);
  console.log(`Test single wish: http://localhost:${PORT}/api/wishes/1`);
  console.log(`Use Postman/Insomnia for POST, PUT, DELETE requests.`);
});
