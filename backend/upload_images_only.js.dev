require("dotenv").config();
const fs = require("fs");
const path = require("path");
const Minio = require("minio");

// ===============================
// ⚙️ CONFIGURACIÓN DE MINIO
// ===============================
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_HOST || "minio",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_PROTOCOL === "https" || true, // fuerza https
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
  region: "us-east-1", // evita error de región vacía (S3Error)
});

const bucketName = "arepabuelas-products";
const IMG_DIR = path.join(__dirname, "images", "products");

console.log("🚀 [UPLOAD] Subida masiva de imágenes a MinIO iniciada...");
console.log("📁 Carpeta local:", IMG_DIR);

// ===============================
// 🧠 FUNCIÓN PRINCIPAL
// ===============================
async function uploadAllImages() {
  try {
    // --- Verificar carpeta ---
    if (!fs.existsSync(IMG_DIR)) {
      throw new Error("❌ No existe la carpeta de imágenes: " + IMG_DIR);
    }

    // --- Verificar bucket ---
    try {
      const exists = await minioClient.bucketExists(bucketName);
      if (!exists) {
        console.log(`📦 Bucket '${bucketName}' no existe. Creándolo...`);
        await minioClient.makeBucket(bucketName, "us-east-1");
        console.log("✅ Bucket creado correctamente.");
      } else {
        console.log(`🪣 Bucket '${bucketName}' ya existe, continuando...`);
      }
    } catch (err) {
      if (
        err.code === "BucketAlreadyOwnedByYou" ||
        err.code === "BucketAlreadyExists"
      ) {
        console.log(`🪣 Bucket '${bucketName}' ya existe (controlado).`);
      } else {
        throw err;
      }
    }

    // --- Listar imágenes ---
    const files = fs.readdirSync(IMG_DIR);
    if (files.length === 0) {
      console.warn("⚠️ No se encontraron imágenes en:", IMG_DIR);
      return;
    }
    console.log("📸 Imágenes encontradas:", files);

    // --- Subir imágenes ---
    for (const file of files) {
      const filePath = path.join(IMG_DIR, file);
      const extension = file.split(".").pop().toLowerCase();
      const contentType =
        extension === "jpg" || extension === "jpeg"
          ? "image/jpeg"
          : extension === "png"
          ? "image/png"
          : "application/octet-stream";

      try {
        console.log(`📤 Subiendo '${file}'...`);
        await minioClient.fPutObject(bucketName, file, filePath, {
          "Content-Type": contentType,
        });
        console.log(
          `✅ Imagen subida: ${process.env.MINIO_PROTOCOL}://${process.env.MINIO_PUBLIC_HOST}:${process.env.MINIO_PORT}/${bucketName}/${file}`
        );
      } catch (uploadErr) {
        console.error(`❌ Error subiendo '${file}':`, uploadErr.message);
      }
    }

    console.log("🎉 Todas las imágenes se subieron correctamente.");
  } catch (err) {
    console.error("❌ [UPLOAD] Error general completo:");
    console.error(err);
  }
}

// ===============================
// 🟢 EJECUCIÓN
// ===============================
uploadAllImages();
