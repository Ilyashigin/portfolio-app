const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const uniqid = require('uniqid');

const app = express();
const PORT = 3000;

// Настройка загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// База данных
const DB_PATH = path.join(__dirname, 'data', 'portfolios.json');

// Инициализация БД с проверкой содержимого
function initDB() {
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ portfolios: [] }, null, 2));
  } else {
    // Проверяем, что файл не пустой и содержит валидный JSON
    try {
      const content = fs.readFileSync(DB_PATH, 'utf8');
      if (!content.trim()) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ portfolios: [] }, null, 2));
      } else {
        JSON.parse(content);
      }
    } catch (e) {
      // Если файл поврежден, пересоздаем его
      fs.writeFileSync(DB_PATH, JSON.stringify({ portfolios: [] }, null, 2));
    }
  }
}

// Получение всех портфолио с обработкой ошибок
function getPortfolios() {
  try {
    initDB();
    const content = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.error('Ошибка чтения БД:', e);
    // Возвращаем пустую структуру, если возникла ошибка
    return { portfolios: [] };
  }
}

// Сохранение портфолио с обработкой ошибок
function savePortfolio(portfolio) {
  try {
    const db = getPortfolios();
    db.portfolios.push(portfolio);
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    return portfolio;
  } catch (e) {
    console.error('Ошибка сохранения портфолио:', e);
    throw e;
  }
}

// Маршруты
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/portfolio', upload.array('works', 20), (req, res) => {
  try {
    const { name, about } = req.body;
    const files = req.files || [];

    if (!name) {
      return res.status(400).json({ success: false, error: 'Имя обязательно' });
    }

    const portfolio = {
      id: uniqid(),
      name,
      about,
      works: files.map(file => ({
        originalname: file.originalname,
        filename: file.filename,
        size: file.size,
        type: file.mimetype
      })),
      createdAt: new Date().toISOString()
    };

    savePortfolio(portfolio);

    res.json({
      success: true,
      portfolioId: portfolio.id,
      redirectUrl: `/portfolio/${portfolio.id}`
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

app.get('/portfolio/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'view.html'));
});

app.get('/api/portfolio/:id', (req, res) => {
  try {
    const db = getPortfolios();
    const portfolio = db.portfolios.find(p => p.id === req.params.id);

    if (portfolio) {
      res.json({ success: true, portfolio });
    } else {
      res.status(404).json({ success: false, error: 'Портфолио не найдено' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
  initDB();
});

function backupDB() {
  if (fs.existsSync(DB_PATH)) {
    const backupPath = path.join(__dirname, 'data', `portfolios_backup_${Date.now()}.json`);
    fs.copyFileSync(DB_PATH, backupPath);
  }
}

// Вызывать перед изменением БД
backupDB();

