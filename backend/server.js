require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'change-this-to-a-secure-key';
const frontendDir = path.join(__dirname, '..');
const uploadsDir = path.join(frontendDir, 'uploads');

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image uploads are allowed.'));
  }
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(frontendDir, 'Pages')));
app.use(express.static(frontendDir));
app.use('/uploads', express.static(uploadsDir));

function requireAdminKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key !== ADMIN_API_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function imageUrlFromRequest(req) {
  if (req.file) return `/uploads/${req.file.filename}`;
  const raw = req.body.image_url || req.body.imageUrl || '';
  return raw.trim() || null;
}

app.get('/api/health', async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 AS ok');
    res.json({
      status: 'ok',
      message: 'Backend is running',
      storage: 'mysql',
      database: rows[0].ok === 1 ? 'connected' : 'not connected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

app.get('/api/gallery', async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM gallery ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch gallery items.' });
  }
});

app.get('/api/events', async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM events ORDER BY event_date ASC, created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch events.' });
  }
});

app.get('/api/news', async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM news ORDER BY posted_date DESC, created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch news.' });
  }
});

app.get('/api/announcements', async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM announcements ORDER BY posted_date DESC, created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch announcements.' });
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone = '', subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'Please fill in all required contact form fields.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    const [result] = await db.query(
      `INSERT INTO contact_messages (name, email, phone, subject, message)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, phone, subject, message]
    );

    res.status(201).json({
      message: 'Thank you! Your message has been sent successfully.',
      id: result.insertId
    });
  } catch (_error) {
    res.status(500).json({ message: 'Failed to save your message.' });
  }
});

app.post('/api/applications', async (req, res) => {
  try {
    const {
      studentName,
      dateOfBirth,
      gender,
      classApplying,
      parentName,
      parentPhone,
      parentEmail = '',
      address,
      previousSchool = ''
    } = req.body;

    if (!studentName || !dateOfBirth || !gender || !classApplying || !parentName || !parentPhone || !address) {
      return res.status(400).json({ message: 'Please fill in all required application fields.' });
    }

    if (parentEmail && !isValidEmail(parentEmail)) {
      return res.status(400).json({ message: 'Please enter a valid parent or guardian email address.' });
    }

    const [result] = await db.query(
      `INSERT INTO applications
      (student_name, dob, gender, class_applying, parent_name, parent_phone, parent_email, address, previous_school)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [studentName, dateOfBirth, gender, classApplying, parentName, parentPhone, parentEmail, address, previousSchool]
    );

    res.status(201).json({
      message: 'Application submitted successfully.',
      id: result.insertId
    });
  } catch (_error) {
    res.status(500).json({ message: 'Failed to submit the application.' });
  }
});

app.get('/api/admin/messages', requireAdminKey, async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM contact_messages ORDER BY created_at DESC');
    res.json(rows);
  } catch (_error) {
    res.status(500).json({ message: 'Failed to fetch messages.' });
  }
});

app.get('/api/admin/applications', requireAdminKey, async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM applications ORDER BY created_at DESC');
    res.json(rows);
  } catch (_error) {
    res.status(500).json({ message: 'Failed to fetch applications.' });
  }
});

app.post('/api/admin/gallery', requireAdminKey, upload.single('image'), async (req, res) => {
  try {
    const { title, category = '', description = '' } = req.body;
    const image_url = imageUrlFromRequest(req);

    if (!title || !image_url) {
      return res.status(400).json({ message: 'Gallery title and image are required.' });
    }

    const [result] = await db.query(
      'INSERT INTO gallery (title, image_url, category, description) VALUES (?, ?, ?, ?)',
      [title, image_url, category, description]
    );

    res.status(201).json({ message: 'Gallery item added successfully.', id: result.insertId, image_url });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to add gallery item.' });
  }
});

app.delete('/api/admin/gallery/:id', requireAdminKey, async (req, res) => {
  try {
    await db.query('DELETE FROM gallery WHERE id = ?', [req.params.id]);
    res.json({ message: 'Gallery item deleted.' });
  } catch (_error) {
    res.status(500).json({ message: 'Failed to delete gallery item.' });
  }
});

app.post('/api/admin/events', requireAdminKey, upload.single('image'), async (req, res) => {
  try {
    const { title, description = '', event_date, event_time = '', location = '' } = req.body;
    const image_url = imageUrlFromRequest(req);

    if (!title || !event_date) {
      return res.status(400).json({ message: 'Event title and date are required.' });
    }

    const [result] = await db.query(
      'INSERT INTO events (title, description, event_date, event_time, location, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, event_date, event_time, location, image_url]
    );

    res.status(201).json({ message: 'Event added successfully.', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to add event.' });
  }
});

app.delete('/api/admin/events/:id', requireAdminKey, async (req, res) => {
  try {
    await db.query('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ message: 'Event deleted.' });
  } catch (_error) {
    res.status(500).json({ message: 'Failed to delete event.' });
  }
});

app.post('/api/admin/news', requireAdminKey, upload.single('image'), async (req, res) => {
  try {
    const { title, content, posted_date } = req.body;
    const image_url = imageUrlFromRequest(req);

    if (!title || !content || !posted_date) {
      return res.status(400).json({ message: 'News title, content, and date are required.' });
    }

    const [result] = await db.query(
      'INSERT INTO news (title, content, image_url, posted_date) VALUES (?, ?, ?, ?)',
      [title, content, image_url, posted_date]
    );

    res.status(201).json({ message: 'News item added successfully.', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to add news item.' });
  }
});

app.delete('/api/admin/news/:id', requireAdminKey, async (req, res) => {
  try {
    await db.query('DELETE FROM news WHERE id = ?', [req.params.id]);
    res.json({ message: 'News item deleted.' });
  } catch (_error) {
    res.status(500).json({ message: 'Failed to delete news item.' });
  }
});

app.post('/api/admin/announcements', requireAdminKey, async (req, res) => {
  try {
    const { title, content, posted_date } = req.body;

    if (!title || !content || !posted_date) {
      return res.status(400).json({ message: 'Announcement title, content, and date are required.' });
    }

    const [result] = await db.query(
      'INSERT INTO announcements (title, content, posted_date) VALUES (?, ?, ?)',
      [title, content, posted_date]
    );

    res.status(201).json({ message: 'Announcement added successfully.', id: result.insertId });
  } catch (_error) {
    res.status(500).json({ message: 'Failed to add announcement.' });
  }
});

app.delete('/api/admin/announcements/:id', requireAdminKey, async (req, res) => {
  try {
    await db.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ message: 'Announcement deleted.' });
  } catch (_error) {
    res.status(500).json({ message: 'Failed to delete announcement.' });
  }
});

app.get('/', (_req, res) => {
  res.redirect('/index.html');
});

app.get('/admin', (_req, res) => {
  res.redirect('/admin.html');
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }
  if (err) {
    return res.status(400).json({ message: err.message || 'Request failed.' });
  }
  res.status(500).json({ message: 'Unexpected server error.' });
});

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

(async function startServer() {
  try {
    await db.initializeDatabase();
    await db.query('SELECT 1');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log('Storage: MySQL');
      console.log(`Uploads: ${uploadsDir}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
