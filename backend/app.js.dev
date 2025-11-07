require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const Minio = require("minio");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcrypt");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const app = express();
const port = 3000;

// Configure CORS
app.use(
  cors({
    origin: ["https://localhost", "https://localhost:443"], // Allow multiple origins for development
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Configure PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: "arepabuelasdb",
  password: process.env.DB_PASS,
  port: 5432,
});

// Configure MinIO client
const minioClient = new Minio.Client({
  endPoint: "minio",
  port: 9000,
  useSSL: true,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // Limit to 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Solo se permiten imágenes JPEG o PNG"));
  },
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || ""; // Use env var in production

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token requerido" });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token inválido" });
    req.user = user;
    next();
  });
}

// Admin middleware (admin or superadmin)
function isAdmin(req, res, next) {
  if (!["admin", "superadmin"].includes(req.user.role)) {
    return res
      .status(403)
      .json({ error: "Acceso denegado: Requiere rol de admin o superadmin" });
  }
  next();
}

// Superadmin middleware
function isSuperAdmin(req, res, next) {
  if (req.user.role !== "superadmin") {
    return res
      .status(403)
      .json({ error: "Acceso denegado: Requiere rol de superadmin" });
  }
  next();
}

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  res.status(500).json({
    error: "Error interno del servidor",
    details: err.message,
    path: req.path,
  });
});

// Ensure the MinIO buckets exist
async function ensureBuckets() {
  const userBucket = "arepabuelas-users";
  const productBucket = "arepabuelas-products";
  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: "*",
        Action: ["s3:GetObject"],
        Resource: ["arn:aws:s3:::${bucketName}/*"],
      },
    ],
  };

  try {
    for (const bucketName of [userBucket, productBucket]) {
      console.log(`Checking if bucket ${bucketName} exists...`);
      const bucketExists = await minioClient.bucketExists(bucketName);
      if (!bucketExists) {
        console.log(`Creating bucket ${bucketName}...`);
        await minioClient.makeBucket(bucketName, "us-east-1");
        console.log(`Bucket ${bucketName} created successfully`);
      } else {
        console.log(`Bucket ${bucketName} already exists`);
      }
      console.log(`Setting bucket policy for ${bucketName}...`);
      await minioClient.setBucketPolicy(
        bucketName,
        JSON.stringify(policy).replace("${bucketName}", bucketName)
      );
      console.log(`Bucket policy set for ${bucketName}`);
    }
  } catch (err) {
    console.error("Error in ensureBuckets:", {
      error: err.message,
      code: err.code,
      stack: err.stack,
    });
    throw new Error(`Failed to set up MinIO buckets: ${err.message}`);
  }
}

// Initialize buckets on startup
ensureBuckets().catch((err) => {
  console.error("Failed to initialize MinIO buckets:", err);
  process.exit(1);
});

// Test route for PostgreSQL
app.get("/api/hello", async (req, res, next) => {
  try {
    console.log("Testing PostgreSQL connection...");
    const result = await pool.query("SELECT NOW()");
    console.log("PostgreSQL query successful:", result.rows[0]);
    res.json({ message: "Hello from Backend!", time: result.rows[0].now });
  } catch (err) {
    console.error("PostgreSQL connection error:", {
      error: err.message,
      stack: err.stack,
    });
    next(err);
  }
});

// MinIO connection test endpoint
app.get("/api/minio-test", async (req, res, next) => {
  try {
    console.log("Testing MinIO connection...");
    const buckets = await minioClient.listBuckets();
    console.log(
      "Buckets listed:",
      buckets.map((b) => b.name)
    );
    const bucketName = "arepabuelas-users";
    const bucketExists = await minioClient.bucketExists(bucketName);
    console.log(`Bucket ${bucketName} exists: ${bucketExists}`);
    const testObjectName = `test_${Date.now()}.txt`;
    await minioClient.putObject(
      bucketName,
      testObjectName,
      Buffer.from("Test content"),
      {
        "Content-Type": "text/plain",
      }
    );
    console.log(`Test object ${testObjectName} uploaded to ${bucketName}`);
    const testObjectUrl = `http://${process.env.MINIO_HOST}:${process.env.MINIO_PORT}/${bucketName}/${testObjectName}`;
    console.log(`Test object URL: ${testObjectUrl}`);
    await minioClient.removeObject(bucketName, testObjectName);
    console.log(`Test object ${testObjectName} removed`);
    res.status(200).json({
      message: "MinIO connection successful",
      buckets: buckets.map((b) => b.name),
      targetBucketExists: bucketExists,
      testObjectUrl: testObjectUrl,
    });
  } catch (err) {
    console.error("MinIO connection test failed:", {
      error: err.message,
      code: err.code,
      stack: err.stack,
    });
    next(err);
  }
});

// ===============================
// 📸 Register endpoint (para clientes)
// ===============================
app.post("/api/register", upload.single("foto"), async (req, res, next) => {
  console.log("📩 Received /api/register request:", {
    body: req.body,
    file: req.file
      ? { originalname: req.file.originalname, size: req.file.size }
      : "No file",
  });

  try {
    const { nombre, correo, password } = req.body;
    const foto = req.file;
    const missingFields = [];

    if (!nombre) missingFields.push("nombre");
    if (!correo) missingFields.push("correo");
    if (!password) missingFields.push("password");
    if (!foto) missingFields.push("foto");

    if (missingFields.length > 0) {
      return res
        .status(400)
        .json({
          error: `Faltan los siguientes campos: ${missingFields.join(", ")}`,
        });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return res.status(400).json({ error: "Correo inválido" });
    }

    // 🔎 Validar correo duplicado
    const emailCheck = await pool.query(
      "SELECT id_usuario FROM usuario WHERE correo = $1",
      [correo]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: "El correo ya está registrado" });
    }

    // 🔐 Encriptar contraseña
    const password_hash = await bcrypt.hash(password, 10);

    // 📸 Subir imagen a MinIO
    const fileExtension = path.extname(foto.originalname).toLowerCase();
    const fileName = `profile_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 15)}${fileExtension}`;

    await minioClient.putObject("arepabuelas-users", fileName, foto.buffer, {
      "Content-Type": foto.mimetype,
    });

    // 📁 Nueva URL interna consistente con productos
    const fotoUrl = `/api/images/users/${fileName}`;

    // 💾 Insertar usuario en BD
    const result = await pool.query(
      `
      INSERT INTO usuario (nombre, correo, password_hash, foto_url, rol, aprobado, fecha_registro)
      VALUES ($1, $2, $3, $4, 'cliente', FALSE, CURRENT_TIMESTAMP)
      RETURNING id_usuario
      `,
      [nombre, correo, password_hash, fotoUrl]
    );

    console.log("✅ Usuario registrado correctamente:", {
      id_usuario: result.rows[0].id_usuario,
      correo,
    });

    res
      .status(201)
      .json({ message: "Usuario registrado exitosamente", foto_url: fotoUrl });
  } catch (err) {
    console.error("❌ Registration error:", err);
    next(err);
  }
});


// ===============================
// 🖼️ Nueva ruta para servir imágenes de usuarios
// ===============================
app.get("/api/images/users/:filename", async (req, res) => {
  const { filename } = req.params;
  try {
    const data = await minioClient.getObject("arepabuelas-users", filename);
    const stat = await minioClient.statObject("arepabuelas-users", filename);
    res.setHeader("Content-Type", stat.metaData["content-type"] || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    data.pipe(res);
  } catch (err) {
    console.error("Error obteniendo imagen de usuario:", err);
    res.status(404).send("Imagen no encontrada");
  }
});


// Login endpoint
app.post("/api/login", async (req, res, next) => {
  console.log("Received /api/login request:", { body: req.body });
  try {
    const { correo, password } = req.body;
    // Validate inputs
    const missingFields = [];
    if (!correo) missingFields.push("correo");
    if (!password) missingFields.push("password");
    if (missingFields.length > 0) {
      console.error("Validation failed: Missing required fields", {
        missingFields,
      });
      return res
        .status(400)
        .json({
          error: `Faltan los siguientes campos: ${missingFields.join(", ")}`,
        });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      console.error("Validation failed: Invalid email", { correo });
      return res.status(400).json({ error: "Correo inválido" });
    }
    // Check if user exists
    console.log("Checking user credentials:", { correo });
    const userQuery = await pool.query(
      "SELECT id_usuario, nombre, correo, password_hash, rol, aprobado FROM usuario WHERE correo = $1",
      [correo]
    );
    if (userQuery.rows.length === 0) {
      console.error("User not found:", { correo });
      return res.status(401).json({ error: "Correo o contraseña incorrectos" });
    }
    const user = userQuery.rows[0];
    // Check if user is approved
    if (!user.aprobado) {
      console.error("User not approved:", { correo });
      return res
        .status(403)
        .json({ error: "Cuenta no aprobada. Contacta al administrador." });
    }
    // Verify password
    console.log("Verifying password for user:", { correo });
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      console.error("Invalid password:", { correo });
      return res.status(401).json({ error: "Correo o contraseña incorrectos" });
    }
    // Generate JWT
    const token = jwt.sign(
      { id: user.id_usuario, role: user.rol },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    console.log("Login successful:", {
      id_usuario: user.id_usuario,
      correo,
      rol: user.rol,
    });
    res.status(200).json({
      message: "Inicio de sesión exitoso",
      user: {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        correo: user.correo,
        rol: user.rol,
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", {
      error: err.message,
      stack: err.stack,
      body: req.body,
    });
    next(err);
  }
});

// Users CRUD (for admin panel)

// GET /api/users - List all users
app.get("/api/users", authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        id_usuario, 
        nombre, 
        correo, 
        rol::TEXT as rol, 
        aprobado, 
        fecha_registro, 
        foto_url 
      FROM Usuario
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id/approve - Approve a user
app.put(
  "/api/users/:id/approve",
  authenticateToken,
  isAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `
      UPDATE usuario 
      SET aprobado = TRUE, aprobado_por = $2
      WHERE id_usuario = $1 
      RETURNING 
        id_usuario, nombre, correo, rol::TEXT as rol, aprobado, aprobado_por, fecha_registro, foto_url
    `,
        [id, req.user.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      res.json({
        message: "Usuario aprobado exitosamente",
        user: result.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/users/:id/role - Cambiar rol (cliente o admin)
app.put(
  "/api/users/:id/role",
  authenticateToken,
  isAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { rol } = req.body;

      if (!rol) {
        return res.status(400).json({ error: "Falta el campo 'rol'" });
      }

      // Solo permitir 'admin' o 'cliente'
      if (!["admin", "cliente"].includes(rol.toLowerCase())) {
        return res
          .status(400)
          .json({ error: "Rol inválido. Solo se permite 'admin' o 'cliente'." });
      }

      // Verificar si el usuario existe y que no sea superadmin
      const target = await pool.query(
        "SELECT rol FROM usuario WHERE id_usuario = $1",
        [id]
      );
      if (target.rows.length === 0) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      if (target.rows[0].rol === "superadmin") {
        return res
          .status(403)
          .json({ error: "No se puede modificar el rol de un superadmin" });
      }

      // Actualizar el rol
      const result = await pool.query(
        `
        UPDATE usuario
        SET rol = $2
        WHERE id_usuario = $1
        RETURNING id_usuario, nombre, correo, rol::TEXT as rol, aprobado
      `,
        [id, rol]
      );

      res.json({
        message: "Rol actualizado correctamente",
        user: result.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/users/:id/deactivate - Desactivar usuario
app.put(
  "/api/users/:id/deactivate",
  authenticateToken,
  isAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      // Verificar existencia del usuario
      const checkUser = await pool.query(
        "SELECT id_usuario FROM usuario WHERE id_usuario = $1",
        [id]
      );
      if (checkUser.rows.length === 0) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      // Actualizar aprobado a FALSE
      const result = await pool.query(
        `
        UPDATE usuario
        SET aprobado = FALSE
        WHERE id_usuario = $1
        RETURNING id_usuario, nombre, correo, rol::TEXT as rol, aprobado
      `,
        [id]
      );

      res.json({
        message: "Usuario desactivado correctamente",
        user: result.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }
);
// PUT /api/users/:id/role - Cambiar rol (cliente o admin)
app.put(
  "/api/users/:id/role",
  authenticateToken,
  isAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { rol } = req.body;

      if (!rol) {
        return res.status(400).json({ error: "Falta el campo 'rol'" });
      }

      // Solo permitir 'admin' o 'cliente'
      if (!["admin", "cliente"].includes(rol.toLowerCase())) {
        return res
          .status(400)
          .json({ error: "Rol inválido. Solo se permite 'admin' o 'cliente'." });
      }

      // Verificar si el usuario existe y que no sea superadmin
      const target = await pool.query(
        "SELECT rol FROM usuario WHERE id_usuario = $1",
        [id]
      );
      if (target.rows.length === 0) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      if (target.rows[0].rol === "superadmin") {
        return res
          .status(403)
          .json({ error: "No se puede modificar el rol de un superadmin" });
      }

      // Actualizar el rol
      const result = await pool.query(
        `
        UPDATE usuario
        SET rol = $2
        WHERE id_usuario = $1
        RETURNING id_usuario, nombre, correo, rol::TEXT as rol, aprobado
      `,
        [id, rol]
      );

      res.json({
        message: "Rol actualizado correctamente",
        user: result.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/users/:id/deactivate - Desactivar usuario
app.put(
  "/api/users/:id/deactivate",
  authenticateToken,
  isAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      // Verificar existencia del usuario
      const checkUser = await pool.query(
        "SELECT id_usuario FROM usuario WHERE id_usuario = $1",
        [id]
      );
      if (checkUser.rows.length === 0) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      // Actualizar aprobado a FALSE
      const result = await pool.query(
        `
        UPDATE usuario
        SET aprobado = FALSE
        WHERE id_usuario = $1
        RETURNING id_usuario, nombre, correo, rol::TEXT as rol, aprobado
      `,
        [id]
      );

      res.json({
        message: "Usuario desactivado correctamente",
        user: result.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }
);


// DELETE /api/users/:id - Delete a user
app.delete(
  "/api/users/:id",
  authenticateToken,
  isAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const requesterId = req.user.id; // <-- JWT payload contains the logged-in user id

      // ---- 1. Prevent self-deletion (any role) ----
      if (parseInt(id) === requesterId) {
        return res.status(403).json({
          error: "No puedes eliminar tu propia cuenta",
        });
      }

      // ---- 2. Get target user ----
      const targetQuery = await pool.query(
        "SELECT rol, foto_url FROM usuario WHERE id_usuario = $1",
        [id]
      );
      if (targetQuery.rows.length === 0) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      const { rol: targetRole, foto_url } = targetQuery.rows[0];

      // ---- 3. Only superadmin can delete another admin ----
      if (targetRole === "admin" && req.user.role !== "superadmin") {
        return res.status(403).json({
          error: "Solo superadmin puede eliminar admins",
        });
      }

      // ---- 4. Prevent deletion of ANY superadmin (even by another superadmin) ----
      if (targetRole === "superadmin") {
        return res.status(403).json({
          error: "No se permite eliminar cuentas de superadmin",
        });
      }

      // ---- 5. Delete photo from MinIO (if exists) ----
      if (foto_url) {
        const bucket = "arepabuelas-users";
        const objectName = foto_url.split("/").pop();
        try {
          await minioClient.removeObject(bucket, objectName);
          console.log(`Foto eliminada de MinIO: ${objectName}`);
        } catch (minioErr) {
          console.error("Error al eliminar foto de MinIO:", minioErr);
          // Continue – DB deletion is more important
        }
      }

      // ---- 6. Delete from DB ----
      await pool.query("DELETE FROM usuario WHERE id_usuario = $1", [id]);

      res.json({ message: "Usuario eliminado exitosamente" });
    } catch (err) {
      next(err);
    }
  }
);
// GET /api/users/me - Obtiene el perfil del usuario autenticado
app.get("/api/users/me", authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        id_usuario, 
        nombre, 
        correo, 
        rol::TEXT as rol, 
        aprobado, 
        fecha_registro, 
        foto_url
      FROM usuario
      WHERE id_usuario = $1
    `,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const user = result.rows[0];

    // Mantén la URL tal como está guardada en la base de datos
    user.foto_url = user.foto_url || null;

    res.json(user);
  } catch (err) {
    console.error("Error en /api/users/me:", err);
    next(err);
  }
});


// Products CRUD

// POST /api/products - Create product
app.post(
  "/api/products",
  authenticateToken,
  isAdmin,
  upload.single("imagen"),
  async (req, res, next) => {
    try {
      const { nombre, precio, descripcion } = req.body;
      const imagen = req.file;
      const missingFields = [];
      if (!nombre) missingFields.push("nombre");
      if (!precio) missingFields.push("precio");
      if (!descripcion) missingFields.push("descripcion");
      if (!imagen) missingFields.push("imagen");
      if (missingFields.length > 0) {
        return res
          .status(400)
          .json({
            error: `Faltan los siguientes campos: ${missingFields.join(", ")}`,
          });
      }
      const fileExtension = path.extname(imagen.originalname).toLowerCase();
      const fileName = `product_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 15)}${fileExtension}`;
      // Upload to MinIO
      await minioClient.putObject(
        "arepabuelas-products",
        fileName,
        imagen.buffer,
        {
          "Content-Type": imagen.mimetype,
        }
      );
      const imagenUrl = `/api/images/products/${fileName}`;
      // Insert into DB (assuming Producto table: id_producto, nombre, precio, descripcion, imagen_url)
      const query = `
      INSERT INTO Producto (nombre, precio, descripcion, imagen_url)
      VALUES ($1, $2, $3, $4)
      RETURNING id_producto
    `;
      const values = [nombre, parseFloat(precio), descripcion, imagenUrl];
      const result = await pool.query(query, values);
      res
        .status(201)
        .json({
          message: "Producto creado exitosamente",
          id_producto: result.rows[0].id_producto,
        });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/products - List all products
app.get("/api/products", authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM Producto");
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/public/products - Productos visibles públicamente (sin token)
app.get("/api/public/products", async (req, res, next) => {
  try {
    // Solo los productos activos (opcional)
    const result = await pool.query(`
      SELECT id_producto, nombre, precio, descripcion, imagen_url
      FROM Producto
      ORDER BY id_producto ASC
    `);

    // Asegura que las URLs sean absolutas y accesibles desde el front
    const products = result.rows.map((p) => ({
      id: p.id_producto,
      nombre: p.nombre,
      precio: p.precio,
      descripcion: p.descripcion,
      imagen_url: p.imagen_url
        ? `${req.protocol}://${req.get("host")}${p.imagen_url}`
        : "/img/no-image.png",
    }));

    res.json(products);
  } catch (err) {
    console.error("Error obteniendo productos públicos:", err);
    next(err);
  }
});

app.get("/api/public/products/:id", async (req, res, next) => {
  try {
    const id = req.params.id;

    // ✅ Fix: wrap SQL query in backticks and ensure parameters are correct
    const result = await pool.query(
      `SELECT id_producto, nombre, precio, descripcion, imagen_url 
       FROM Producto 
       WHERE id_producto = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const p = result.rows[0];

    // ✅ Fix: use template string properly for image URL
    const product = {
      id: p.id_producto,
      nombre: p.nombre,
      precio: p.precio,
      descripcion: p.descripcion,
      imagen_url: p.imagen_url
        ? `${req.protocol}://${req.get("host")}${p.imagen_url}`
        : "/img/no-image.png",
    };

    res.json(product);
  } catch (err) {
    console.error("Error obteniendo producto público:", err);
    next(err);
  }
});

// PUT /api/products/:id - Update product
app.put(
  "/api/products/:id",
  authenticateToken,
  isAdmin,
  upload.single("imagen"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { nombre, precio, descripcion } = req.body;
      const imagen = req.file;
      // Get current product
      const currentQuery = await pool.query(
        "SELECT imagen_url FROM Producto WHERE id_producto = $1",
        [id]
      );
      if (currentQuery.rows.length === 0) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }
      let imagenUrl = currentQuery.rows[0].imagen_url;
      if (imagen) {
        // Delete old image
        const oldObjectName = imagenUrl.split("/").pop();
        try {
          await minioClient.removeObject("arepabuelas-products", oldObjectName);
        } catch (minioErr) {
          console.error("Error al eliminar imagen antigua:", minioErr);
        }
        // Upload new
        const fileExtension = path.extname(imagen.originalname).toLowerCase();
        const fileName = `product_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 15)}${fileExtension}`;
        await minioClient.putObject(
          "arepabuelas-products",
          fileName,
          imagen.buffer,
          {
            "Content-Type": imagen.mimetype,
          }
        );
        imagenUrl = `/api/images/products/${fileName}`;
      }
      // Update DB
      const query = `
      UPDATE Producto
      SET nombre = $1, precio = $2, descripcion = $3, imagen_url = $4
      WHERE id_producto = $5
      RETURNING *
    `;
      const values = [
        nombre || null,
        precio ? parseFloat(precio) : null,
        descripcion || null,
        imagenUrl,
        id,
      ];
      const result = await pool.query(query, values);
      res.json({
        message: "Producto actualizado exitosamente",
        product: result.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/products/:id - Delete product
app.delete(
  "/api/products/:id",
  authenticateToken,
  isAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      // Get imagen_url
      const query = await pool.query(
        "SELECT imagen_url FROM Producto WHERE id_producto = $1",
        [id]
      );
      if (query.rows.length === 0) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }
      const imagenUrl = query.rows[0].imagen_url;
      // Delete from MinIO
      if (imagenUrl) {
        const objectName = imagenUrl.split("/").pop();
        try {
          await minioClient.removeObject("arepabuelas-products", objectName);
          console.log(`Imagen eliminada de MinIO: ${objectName}`);
        } catch (minioErr) {
          console.error("Error al eliminar imagen de MinIO:", minioErr);
        }
      }
      // Delete from DB
      await pool.query("DELETE FROM Producto WHERE id_producto = $1", [id]);
      res.json({ message: "Producto eliminado exitosamente" });
    } catch (err) {
      next(err);
    }
  }
);

// Sirve imágenes de productos
app.get("/api/images/products/:filename", async (req, res) => {
  const { filename } = req.params;
  try {
    const data = await minioClient.getObject("arepabuelas-products", filename);
    const stat = await minioClient.statObject("arepabuelas-products", filename);
    res.setHeader("Content-Type", stat.metaData["content-type"] || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    data.pipe(res);
  } catch (err) {
    res.status(404).send("Imagen no encontrada");
  }
});

app.get(
  "/api/historial-compras",
  authenticateToken,
  isAdmin,
  async (req, res, next) => {
    try {
      const { from, to } = req.query;
      const params = [];
      let where = "";

      if (from) {
        params.push(from);
        where += ` WHERE DATE(p.fecha_pedido) >= $${params.length}`;
      }
      if (to) {
        params.push(to);
        where += `${where ? " AND" : " WHERE"} DATE(p.fecha_pedido) <= $${
          params.length
        }`;
      }

      const q = `
      SELECT
        u.correo,
        u.nombre,
        p.id_pedido,
        p.fecha_pedido AS fecha,
        p.estado,
        p.total,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id_producto', pr.id_producto,
            'nombre', pr.nombre,
            'cantidad', dp.cantidad,
            'subtotal', dp.subtotal
          )
          ORDER BY pr.nombre
        ) AS productos
      FROM Pedido p
      JOIN Usuario u       ON u.id_usuario = p.id_usuario
      JOIN DetallePedido dp ON dp.id_pedido = p.id_pedido
      JOIN Producto pr     ON pr.id_producto = dp.id_producto
      ${where}
      GROUP BY u.correo, u.nombre, p.id_pedido, p.fecha_pedido, p.estado, p.total
      ORDER BY p.fecha_pedido DESC;
    `;

      const { rows } = await pool.query(q, params);
      res.json(rows);
    } catch (err) {
      console.error("Error en /api/historial-compras:", err);
      next(err);
    }
  }
);

// ===============================
// 💬 Comments Endpoints
// ===============================

// POST /api/comments - Add a comment to a product
app.post("/api/comments", authenticateToken, async (req, res, next) => {
  console.log("Received /api/comments request:", { body: req.body });
  try {
    const { id_producto, comentario, calificacion } = req.body;
    const missingFields = [];
    if (!id_producto) missingFields.push("id_producto");
    if (!comentario) missingFields.push("comentario");
    if (!calificacion) missingFields.push("calificacion");
    if (missingFields.length > 0) {
      return res
        .status(400)
        .json({
          error: `Faltan los siguientes campos: ${missingFields.join(", ")}`,
        });
    }
    if (calificacion < 1 || calificacion > 5) {
      return res.status(400).json({ error: "Calificación debe estar entre 1 y 5" });
    }
    // Check if product exists
    const productCheck = await pool.query(
      "SELECT id_producto FROM Producto WHERE id_producto = $1",
      [id_producto]
    );
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    const result = await pool.query(
      `
      INSERT INTO Comentario (id_usuario, id_producto, comentario, calificacion)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [req.user.id, id_producto, comentario, calificacion]
    );
    res.status(201).json({
      message: "Comentario agregado exitosamente",
      comment: result.rows[0],
    });
  } catch (err) {
    console.error("Comment creation error:", err);
    next(err);
  }
});

// GET /api/public/products/:id/comments - Get comments for a product (public)
app.get("/api/public/products/:id/comments", async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `
      SELECT 
        c.id_comentario,
        c.comentario,
        c.calificacion,
        c.fecha,
        u.nombre AS usuario_nombre
      FROM Comentario c
      JOIN Usuario u ON c.id_usuario = u.id_usuario
      WHERE c.id_producto = $1
      ORDER BY c.fecha DESC
      `,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching comments:", err);
    next(err);
  }
});

// ===============================
// 🎟️ Coupon Endpoints
// ===============================

// GET /api/coupons/check - Check if user has a coupon available
app.get("/api/coupons/check", authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT cupon FROM Usuario WHERE id_usuario = $1",
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json({ hasCoupon: result.rows[0].cupon });
  } catch (err) {
    console.error("Coupon check error:", err);
    next(err);
  }
});

// ===============================
// 💳 Payments Endpoint (Simulated)
// ===============================
app.post("/api/payments", authenticateToken, async (req, res, next) => {
  console.log("Received /api/payments request:", { body: req.body });

  const client = await pool.connect();

  try {
    const { correo, titular, numero_tarjeta, tipo, carrito } = req.body;

    // Validate input
    const missingFields = [];
    if (!titular) missingFields.push("titular");
    if (!numero_tarjeta) missingFields.push("numero_tarjeta");
    if (!tipo) missingFields.push("tipo");
    if (!Array.isArray(carrito) || carrito.length === 0)
      missingFields.push("carrito (productos)");
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Faltan los siguientes campos: ${missingFields.join(", ")}`,
      });
    }

    if (tipo !== "debito" && tipo !== "credito") {
      return res.status(400).json({ error: "Tipo de pago inválido" });
    }

    if (numero_tarjeta.length !== 16 || isNaN(numero_tarjeta)) {
      return res.status(400).json({ error: "Número de tarjeta inválido" });
    }

    // ✅ Start transaction
    await client.query("BEGIN");

    // =======================================
    // 1️⃣ Create new order (Pedido)
    // =======================================
    const pedidoResult = await client.query(
      `
      INSERT INTO Pedido (id_usuario, estado, total)
      VALUES ($1, 'pendiente', 0.00)
      RETURNING id_pedido
      `,
      [req.user.id]
    );
    const id_pedido = pedidoResult.rows[0].id_pedido;

    let total = 0;

    // =======================================
    // 2️⃣ Insert each item in DetallePedido
    // =======================================
    for (const item of carrito) {
      const { id_producto, cantidad } = item;

      // Get product price
      const prodResult = await client.query(
        "SELECT precio FROM Producto WHERE id_producto = $1",
        [id_producto]
      );

      if (prodResult.rows.length === 0) {
        throw new Error(`Producto con ID ${id_producto} no encontrado`);
      }

      const precio = parseFloat(prodResult.rows[0].precio);
      const subtotal = precio * cantidad;
      total += subtotal;

      await client.query(
        `
        INSERT INTO DetallePedido (id_pedido, id_producto, cantidad, subtotal)
        VALUES ($1, $2, $3, $4)
        `,
        [id_pedido, id_producto, cantidad, subtotal]
      );
    }

    // =======================================
    // 3️⃣ Check coupon & apply discount
    // =======================================
    const userCouponCheck = await client.query(
      "SELECT cupon FROM Usuario WHERE id_usuario = $1",
      [req.user.id]
    );

    let descuento_aplicado = 0;
    let cupon_usado = false;

    if (userCouponCheck.rows.length > 0 && userCouponCheck.rows[0].cupon) {
      // Apply 10% discount (can change the %)
      descuento_aplicado = total * 0.1;
      total -= descuento_aplicado;

      // Mark coupon as used
      await client.query(
        "UPDATE Usuario SET cupon = FALSE WHERE id_usuario = $1",
        [req.user.id]
      );
      cupon_usado = true;
    }

    // =======================================
    // 4️⃣ Update Pedido total
    // =======================================
    await client.query(
      `UPDATE Pedido SET total = $1, estado = 'pagado' WHERE id_pedido = $2`,
      [total, id_pedido]
    );

    // =======================================
    // 5️⃣ Store simulated card info
    // =======================================
    const primeros_6_digitos = numero_tarjeta.slice(0,6)
    const ultimos_4_digitos = numero_tarjeta.slice(-4);
    const tarjetaResult = await client.query(
      `
      INSERT INTO TarjetaSimulada (id_usuario, primeros_6_digitos, ultimos_4_digitos, tipo, nombre_titular)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id_tarjeta
      `,
      [req.user.id, primeros_6_digitos, ultimos_4_digitos, tipo, titular]
    );
    const id_tarjeta = tarjetaResult.rows[0].id_tarjeta;

    // =======================================
    // 6️⃣ Record payment in PagoSimulado
    // =======================================
    const referencia = `REF-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    await client.query(
      `
      INSERT INTO PagoSimulado (id_usuario, id_pedido, metodo, estado, referencia)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [req.user.id, id_pedido, tipo, "exitoso", referencia]
    );

    // =======================================
    // 7️⃣ Commit transaction
    // =======================================
    await client.query("COMMIT");

    console.log("✅ Pago simulado procesado:", {
      id_tarjeta,
      id_pedido,
      correo,
      cupon_usado,
      descuento_aplicado,
    });

    res.status(201).json({
      message: "Pago procesado exitosamente",
      id_pedido,
      total,
      id_tarjeta,
      referencia,
      cupon_usado,
      descuento_aplicado,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Payment error:", err);
    next(err);
  } finally {
    client.release();
  }
});

// ===============================
// 🧾 GET Pedido Info (Receipt)
// ===============================
app.get("/api/pedidos/:id", authenticateToken, async (req, res, next) => {
  try {
    const pedidoId = req.params.id;
    const userId = req.user.id; // from JWT auth

    // 1️⃣ Get main order info + payment + user
    const pedidoQuery = `
      SELECT 
        p.id_pedido,
        p.fecha_pedido,
        p.total,
        p.estado,
        u.nombre AS cliente_nombre,
        u.correo AS cliente_correo,
        COALESCE(pg.metodo, 'tarjeta') AS metodo_pago,
        pg.fecha_pago
      FROM Pedido p
      JOIN Usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN PagoSimulado pg ON p.id_pedido = pg.id_pedido
      WHERE p.id_pedido = $1 AND p.id_usuario = $2
      LIMIT 1;
    `;
    const pedidoResult = await pool.query(pedidoQuery, [pedidoId, userId]);

    if (pedidoResult.rows.length === 0) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const pedido = pedidoResult.rows[0];

    // 2️⃣ Get item details (DetallePedido + Producto)
    const detallesQuery = `
      SELECT 
        dp.id_producto,
        pr.nombre,
        dp.cantidad,
        pr.precio,
        dp.subtotal,
        pr.imagen_url
      FROM DetallePedido dp
      JOIN Producto pr ON dp.id_producto = pr.id_producto
      WHERE dp.id_pedido = $1;
    `;
    const detallesResult = await pool.query(detallesQuery, [pedidoId]);

    pedido.items = detallesResult.rows;

    // 3️⃣ Compute subtotal and total (ensure values are numeric)
    pedido.subtotal = detallesResult.rows.reduce((sum, it) => sum + Number(it.subtotal), 0);
    pedido.total = Number(pedido.total);

    res.json(pedido);
  } catch (err) {
    console.error("❌ Error al obtener pedido:", err);
    next(err);
  }
});

app.get(
  "/api/historial-compras",
  authenticateToken,
  isAdmin,
  async (req, res, next) => {
    try {
      const { from, to } = req.query;
      const params = [];
      let where = "";
      if (from) {
        params.push(from);
        where += ` WHERE DATE(p.fecha_pedido) >= $${params.length}`;
      }
      if (to) {
        params.push(to);
        where += `${where ? " AND" : " WHERE"} DATE(p.fecha_pedido) <= $${params.length}`;
      }

      const q = `
        SELECT
          p.id_pedido,
          u.correo,
          u.nombre,
          p.fecha_pedido AS fecha,
          p.total,
          p.estado,
          STRING_AGG(
            pr.nombre || ' x' || dp.cantidad,
            ', '
            ORDER BY pr.nombre
          ) AS productos
        FROM Pedido p
        JOIN Usuario u ON u.id_usuario = p.id_usuario
        JOIN DetallePedido dp ON dp.id_pedido = p.id_pedido
        JOIN Producto pr ON pr.id_producto = dp.id_producto
        ${where}
        GROUP BY p.id_pedido, u.correo, u.nombre, p.fecha_pedido, p.total, p.estado
        ORDER BY p.fecha_pedido DESC;
      `;

      const { rows } = await pool.query(q, params);
      res.json(rows);
    } catch (err) {
      console.error("Error en /api/historial-compras:", err);
      next(err);
    }
  }
);

// ===============================
// 🧾 HISTORIAL DE COMPRAS — CLIENTE
// ===============================
app.get("/api/orders/user/:email", authenticateToken, async (req, res, next) => {
  try {
    const { email } = req.params;

    // 1️⃣ Buscar al usuario en base al correo
    const userQuery = await pool.query(
      "SELECT id_usuario FROM Usuario WHERE correo = $1",
      [email]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const id_usuario = userQuery.rows[0].id_usuario;

    // 2️⃣ Obtener los pedidos del usuario
    const pedidosQuery = await pool.query(
      `
      SELECT 
        p.id_pedido,
        p.fecha_pedido,
        p.estado,
        p.total
      FROM Pedido p
      WHERE p.id_usuario = $1
      ORDER BY p.fecha_pedido DESC
      `,
      [id_usuario]
    );

    const pedidos = pedidosQuery.rows;

    // 3️⃣ Para cada pedido, obtener los detalles (productos)
    for (const pedido of pedidos) {
      const detallesQuery = await pool.query(
        `
        SELECT 
          d.cantidad,
          pr.nombre,
          pr.precio
        FROM DetallePedido d
        JOIN Producto pr ON d.id_producto = pr.id_producto
        WHERE d.id_pedido = $1
        `,
        [pedido.id_pedido]
      );

      pedido.productos = detallesQuery.rows.map((r) => ({
        producto: r.nombre,
        cantidad: r.cantidad,
        precio: r.precio,
      }));
    }

    // 4️⃣ Enviar el historial completo
    res.json(pedidos);
  } catch (err) {
    console.error("❌ Error obteniendo historial de compras:", err);
    next(err);
  }
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
