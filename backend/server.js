const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://api-inventory.isavralabel.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'ptps-secret-key-2024';

// Database connection
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ptps_reporting_system'
};

let db;

async function initializeDatabase() {
  try {
    db = await mysql.createConnection(dbConfig);
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

// Authentication middleware
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.userRole;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.userRole;
    
    if (decoded.userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes

// Register user
app.post('/api/register', async (req, res) => {
  try {
    const { nama, alamat, jabatan, nomor_ptps, kelurahan, kecamatan, nomor_hp, email, password } = req.body;
    
    // Check if email or nomor_ptps already exists
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE email = ? OR nomor_ptps = ?',
      [email, nomor_ptps]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email atau Nomor PTPS sudah terdaftar' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user
    await db.execute(
      `INSERT INTO users (nama, alamat, jabatan, nomor_ptps, kelurahan, kecamatan, nomor_hp, email, password, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', 'pending')`,
      [nama, alamat, jabatan, nomor_ptps, kelurahan, kecamatan, nomor_hp, email, hashedPassword]
    );
    
    res.json({ message: 'Registrasi berhasil. Menunggu persetujuan admin.' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const [users] = await db.execute(
      'SELECT id, email, password, role, status, nama FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(400).json({ error: 'Email atau password salah' });
    }
    
    const user = users[0];
    
    if (user.status !== 'approved') {
      return res.status(400).json({ error: 'Akun Anda belum disetujui admin' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Email atau password salah' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, userRole: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        nama: user.nama
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  // JWT is stateless, so just return success
  res.json({ message: 'Logout successful' });
});

// Check auth status
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT id, email, role, nama FROM users WHERE id = ?',
      [req.userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: users[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit report
app.post('/api/reports', requireAuth, async (req, res) => {
  try {
    const { uraian_kejadian, tindak_lanjut_ptps, tindak_lanjut_kpps } = req.body;
    
    await db.execute(
      `INSERT INTO reports (user_id, uraian_kejadian, tindak_lanjut_ptps, tindak_lanjut_kpps, status)
       VALUES (?, ?, ?, ?, 'Terkirim')`,
      [req.userId, uraian_kejadian, tindak_lanjut_ptps || null, tindak_lanjut_kpps || null]
    );
    
    res.json({ message: 'Laporan berhasil dikirim' });
  } catch (error) {
    console.error('Submit report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get reports
app.get('/api/reports', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    let baseQuery = `
      FROM reports r 
      JOIN users u ON r.user_id = u.id
    `;
    let whereClause = '';
    let params = [];
    
    if (req.userRole !== 'admin') {
      whereClause = ' WHERE r.user_id = ?';
      params.push(req.userId);
    }
    
    // Get total count
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total ${baseQuery} ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    
    // Get paginated reports
    const query = `
      SELECT r.*, u.nama, u.nomor_ptps, u.kelurahan, u.kecamatan
      ${baseQuery}
      ${whereClause}
      ORDER BY r.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    const [reports] = await db.execute(query, [...params, limit, offset]);
    
    res.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update report status (admin only)
app.put('/api/reports/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    await db.execute(
      'UPDATE reports SET status = ? WHERE id = ?',
      [status, id]
    );
    
    res.json({ message: 'Status laporan berhasil diperbarui' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get users (admin only)
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Get total count
    const [countResult] = await db.execute('SELECT COUNT(*) as total FROM users');
    const total = countResult[0].total;
    
    // Get paginated users
    const [users] = await db.execute(
      'SELECT id, nama, alamat, jabatan, nomor_ptps, kelurahan, kecamatan, nomor_hp, email, role, status, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    
    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user status (admin only)
app.put('/api/users/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    await db.execute(
      'UPDATE users SET status = ? WHERE id = ?',
      [status, id]
    );
    
    res.json({ message: 'Status user berhasil diperbarui' });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user (admin only)
app.put('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, alamat, jabatan, nomor_ptps, kelurahan, kecamatan, nomor_hp, email, role } = req.body;
    
    // Check if email or nomor_ptps already exists for other users
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE (email = ? OR nomor_ptps = ?) AND id != ?',
      [email, nomor_ptps, id]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email atau Nomor PTPS sudah digunakan oleh user lain' });
    }
    
    await db.execute(
      `UPDATE users SET nama = ?, alamat = ?, jabatan = ?, nomor_ptps = ?, kelurahan = ?, kecamatan = ?, nomor_hp = ?, email = ?, role = ? WHERE id = ?`,
      [nama, alamat, jabatan, nomor_ptps, kelurahan, kecamatan, nomor_hp, email, role, id]
    );
    
    res.json({ message: 'User berhasil diperbarui' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Don't allow deleting the current admin user
    if (parseInt(id) === req.userId) {
      return res.status(400).json({ error: 'Tidak dapat menghapus akun sendiri' });
    }
    
    await db.execute('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User berhasil dihapus' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Initialize database connection and start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});