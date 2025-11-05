#!/bin/sh
echo "🚀 Iniciando backend ArepAbuelas..."

# 1️⃣ Esperar a que PostgreSQL esté disponible
echo "⏳ Esperando a que la base de datos esté lista..."
until nc -z db 5432; do
  echo "⌛ Esperando a PostgreSQL (5432)..."
  sleep 2
done
echo "✅ Base de datos lista."

# 2️⃣ Iniciar el backend en segundo plano
node app.js &
BACKEND_PID=$!

# 3️⃣ Esperar unos segundos para que el backend registre sus rutas
echo "⌛ Esperando a que el backend levante API y MinIO..."
sleep 10

# 4️⃣ Subir imágenes automáticamente al bucket
echo "📦 Ejecutando script de subida de imágenes a MinIO..."
node upload_images_only.js

# 5️⃣ Mantener backend en primer plano
wait $BACKEND_PID
