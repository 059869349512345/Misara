// server.js
// سيرفر بسيط بـ Node.js الأساسي (بدون أي مكتبات خارجية زي Express)
// وظيفته: 1) يعرض ملفات الموقع (HTML/CSS)  2) يستقبل الحجوزات ويخزنها  3) يعرضها بصفحة إدارة

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const DATA_FILE = path.join(__dirname, 'reservations.json');

// كلمة سر بسيطة لصفحة الإدارة (غيّرها لأي شي بتحبه)
const ADMIN_PASSWORD = 'bayttoot2026';

// ----- أدوات مساعدة -----

function readReservations() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function saveReservations(list) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function getContentType(filePath) {
  const ext = path.extname(filePath);
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
  };
  return types[ext] || 'text/plain';
}

function serveStaticFile(res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 - الصفحة غير موجودة</h1>');
      return;
    }
    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(content);
  });
}

// ----- السيرفر -----

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // === API: استقبال حجز جديد ===
  if (pathname === '/api/reservations' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        const newReservation = JSON.parse(body);

        // تحقق بسيط من البيانات الأساسية
        if (!newReservation.name || !newReservation.phone) {
          return sendJSON(res, 400, { success: false, message: 'الاسم ورقم الهاتف مطلوبين' });
        }

        const reservations = readReservations();
        const record = {
          id: Date.now(),
          name: newReservation.name,
          phone: newReservation.phone,
          guests: newReservation.guests || '',
          date: newReservation.date || '',
          notes: newReservation.notes || '',
          createdAt: new Date().toISOString(),
        };
        reservations.push(record);
        saveReservations(reservations);

        sendJSON(res, 201, { success: true, message: 'تم استلام الحجز' });
      } catch (err) {
        sendJSON(res, 400, { success: false, message: 'بيانات غير صالحة' });
      }
    });
    return;
  }

  // === API: عرض كل الحجوزات (لصفحة الإدارة) ===
  if (pathname === '/api/reservations' && req.method === 'GET') {
    const providedPassword = parsedUrl.query.password;
    if (providedPassword !== ADMIN_PASSWORD) {
      return sendJSON(res, 401, { success: false, message: 'كلمة السر غير صحيحة' });
    }
    const reservations = readReservations();
    return sendJSON(res, 200, { success: true, data: reservations.reverse() });
  }

  // === ملفات الموقع الثابتة ===
  let filePath;
  if (pathname === '/') {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  } else if (pathname === '/admin') {
    filePath = path.join(__dirname, 'admin.html');
  } else {
    filePath = path.join(PUBLIC_DIR, pathname);
  }

  serveStaticFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`السيرفر شغال على http://localhost:${PORT}`);
});
