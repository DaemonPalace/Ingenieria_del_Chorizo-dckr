const express = require('express');
const { Pool } = require('pg');
const Minio = require('minio');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

// Configure CORS
app.use(cors({
  origin: ['https://localhost', 'https://localhost:8080'], // Allow multiple origins for development
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// Configure PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: 'arepabuelasdb',
  password: process.env.DB_PASS,
  port: 5432,
});

// Configure MinIO client
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_HOST || 'localhost',
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: false, // Set to true in production with HTTPS
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit to 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes JPEG o PNG'));
  },
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  res.status(500).json({
    error: 'Error interno del servidor',
    details: err.message,
    path: req.path,
  });
});

// Ensure the MinIO bucket exists
async function ensureBucket() {
  const bucketName = 'arepabuelas-users';
  try {
    console.log(`Checking if bucket ${bucketName} exists...`);
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      console.log(`Creating bucket ${bucketName}...`);
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`Bucket ${bucketName} created successfully`);
    } else {
      console.log(`Bucket ${bucketName} already exists`);
    }
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucketName}/*`],
        },
      ],
    };
    console.log(`Setting bucket policy for ${bucketName}...`);
    await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
    console.log(`Bucket policy set for ${bucketName}`);
  } catch (err) {
    console.error('Error in ensureBucket:', {
      error: err.message,
      code: err.code,
      stack: err.stack,
    });
    throw new Error(`Failed to set up MinIO bucket: ${err.message}`);
  }
}

// Initialize bucket on startup
ensureBucket().catch((err) => {
  console.error('Failed to initialize MinIO bucket:', err);
  process.exit(1);
});

// Test route for PostgreSQL
app.get('/api/hello', async (req, res, next) => {
  try {
    console.log('Testing PostgreSQL connection...');
    const result = await pool.query('SELECT NOW()');
    console.log('PostgreSQL query successful:', result.rows[0]);
    res.json({ message: 'Hello from Backend!', time: result.rows[0].now });
  } catch (err) {
    console.error('PostgreSQL connection error:', {
      error: err.message,
      stack: err.stack,
    });
    next(err);
  }
});

// MinIO connection test endpoint
app.get('/api/minio-test', async (req, res, next) => {
  try {
    console.log('Testing MinIO connection...');
    const buckets = await minioClient.listBuckets();
    console.log('Buckets listed:', buckets.map(b => b.name));

    const bucketName = 'arepabuelas-users';
    const bucketExists = await minioClient.bucketExists(bucketName);
    console.log(`Bucket ${bucketName} exists: ${bucketExists}`);

    const testObjectName = `test_${Date.now()}.txt`;
    await minioClient.putObject(bucketName, testObjectName, Buffer.from('Test content'), {
      'Content-Type': 'text/plain',
    });
    console.log(`Test object ${testObjectName} uploaded to ${bucketName}`);

    const testObjectUrl = `http://${process.env.MINIO_HOST}:${process.env.MINIO_PORT}/${bucketName}/${testObjectName}`;
    console.log(`Test object URL: ${testObjectUrl}`);

    await minioClient.removeObject(bucketName, testObjectName);
    console.log(`Test object ${testObjectName} removed`);

    res.status(200).json({
      message: 'MinIO connection successful',
      buckets: buckets.map(b => b.name),
      targetBucketExists: bucketExists,
      testObjectUrl: testObjectUrl,
    });
  } catch (err) {
    console.error('MinIO connection test failed:', {
      error: err.message,
      code: err.code,
      stack: err.stack,
    });
    next(err);
  }
});

// Register endpoint
app.post('/api/register', upload.single('foto'), async (req, res, next) => {
  console.log('Received /api/register request:', {
    body: req.body,
    file: req.file ? { originalname: req.file.originalname, size: req.file.size } : 'No file',
  });

  try {
    const { nombre, correo, password } = req.body;
    const foto = req.file;

    const missingFields = [];
    if (!nombre) missingFields.push('nombre');
    if (!correo) missingFields.push('correo');
    if (!password) missingFields.push('password');
    if (!foto) missingFields.push('foto');

    if (missingFields.length > 0) {
      console.error('Validation failed: Missing required fields', { missingFields });
      return res.status(400).json({ error: `Faltan los siguientes campos: ${missingFields.join(', ')}` });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      console.error('Validation failed: Invalid email', { correo });
      return res.status(400).json({ error: 'Correo inválido' });
    }

    console.log('Checking for existing email:', correo);
    const emailCheck = await pool.query('SELECT id_usuario FROM Usuario WHERE correo = $1', [correo]);
    if (emailCheck.rows.length > 0) {
      console.error('Email already exists:', correo);
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    console.log('Hashing password...');
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    console.log('Password hashed successfully');

    const fileExtension = path.extname(foto.originalname).toLowerCase();
    const fileName = `profile_${Date.now()}_${Math.random().toString(36).substring(2, 15)}${fileExtension}`;
    console.log('Generated filename for upload:', fileName);

    console.log('Uploading photo to MinIO:', { bucket: 'arepabuelas-users', fileName });
    try {
      await minioClient.putObject('arepabuelas-users', fileName, foto.buffer, {
        'Content-Type': foto.mimetype,
      });
      console.log('Photo uploaded successfully:', fileName);
    } catch (err) {
      console.error('MinIO upload failed:', {
        error: err.message,
        code: err.code,
        stack: err.stack,
      });
      throw new Error(`Failed to upload photo to MinIO: ${err.message}`);
    }

    const fotoUrl = `http://${process.env.MINIO_HOST}:${process.env.MINIO_PORT}/arepabuelas-users/${fileName}`;
    console.log('Generated photo URL:', fotoUrl);

    console.log('Inserting user into database:', { nombre, correo, password_hash, fotoUrl });
    const query = `
      INSERT INTO Usuario (nombre, correo, password_hash, foto_url, rol, aprobado, fecha_registro)
      VALUES ($1, $2, $3, $4, 'cliente', FALSE, CURRENT_TIMESTAMP)
      RETURNING id_usuario
    `;
    const values = [nombre, correo, password_hash, fotoUrl];
    const result = await pool.query(query, values);
    console.log('User registered successfully:', { id_usuario: result.rows[0].id_usuario });

    res.status(201).json({ message: 'Usuario registrado exitosamente' });
  } catch (err) {
    console.error('Registration error:', {
      error: err.message,
      stack: err.stack,
      body: req.body,
      file: req.file ? req.file.originalname : 'No file',
    });
    next(err);
  }
});

// Login endpoint
app.post('/api/login', async (req, res, next) => {
  console.log('Received /api/login request:', { body: req.body });

  try {
    const { correo, password } = req.body;

    // Validate inputs
    const missingFields = [];
    if (!correo) missingFields.push('correo');
    if (!password) missingFields.push('password');

    if (missingFields.length > 0) {
      console.error('Validation failed: Missing required fields', { missingFields });
      return res.status(400).json({ error: `Faltan los siguientes campos: ${missingFields.join(', ')}` });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      console.error('Validation failed: Invalid email', { correo });
      return res.status(400).json({ error: 'Correo inválido' });
    }

    // Check if user exists
    console.log('Checking user credentials:', { correo });
    const userQuery = await pool.query('SELECT id_usuario, nombre, correo, password_hash, rol, aprobado FROM Usuario WHERE correo = $1', [correo]);
    if (userQuery.rows.length === 0) {
      console.error('User not found:', { correo });
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const user = userQuery.rows[0];

    // Check if user is approved
    if (!user.aprobado) {
      console.error('User not approved:', { correo });
      return res.status(403).json({ error: 'Cuenta no aprobada. Contacta al administrador.' });
    }

    // Verify password
    console.log('Verifying password for user:', { correo });
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      console.error('Invalid password:', { correo });
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    console.log('Login successful:', { id_usuario: user.id_usuario, correo, rol: user.rol });
    res.status(200).json({
      message: 'Inicio de sesión exitoso',
      user: {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        correo: user.correo,
        rol: user.rol,
      },
    });
  } catch (err) {
    console.error('Login error:', {
      error: err.message,
      stack: err.stack,
      body: req.body,
    });
    next(err);
  }
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});