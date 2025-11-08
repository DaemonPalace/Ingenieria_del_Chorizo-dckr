# 🫓 AREPABUELAS DE LA ESQUINA
# E-COMMERCE  
## Guía de Instalación en Kali Linux (Docker)

**Equipo:** Ingeniería del Chorizo  

---

## 🧩 Requisitos Previos
- Tener **Kali Linux actualizado**.  
- Instalar dependencias:

```bash
sudo apt update && sudo apt install -y git docker.io docker-compose curl unzip
```

- Tener **permisos de sudo**.  
- **Puertos 80 y 443** libres (o modificar `docker-compose.yml` si están ocupados).

---

## 🚀 Paso 1: Obtener el Proyecto
Descargar el .zip de la carpeta que se encuentra en Teams y descomprimirla:

```bash
unzip ingenieria_del_chorizo-dckr.zip -d ~
cd ~/Ingenieria_del_Chorizo-dckr
```

Ejecutar en terminal:

```bash
git clone https://github.com/DaemonPalace/Ingenieria_del_Chorizo-dckr.git
cd Ingenieria_del_Chorizo-dckr
```

---

## ⚙️ Paso 2: Iniciar Instalación
Dar permisos y ejecutar el script:

```bash
sudo chmod +x ./start.sh ./bin/linux/*.sh
sudo ./start.sh
```

---

## 🧭 Menú de Opciones - Ingeniería del Chorizo Stack 

### Install Web Application
→ Instala toda la infraestructura de la aplicación.  
→ Genera los certificados y secretos, y regenera los archivos de instalación (docker-compose.yml, app.js, upload_images_only.js, ./secrets, ./certs).
→ **BORRA TODOS LOS DATOS.**

### Update System/Repository
→ Actualiza el sistema de la kali, actualiza el código desde GitHub y **reconstruye contenedores**.
→ Vuelve a instalar la infraestructura de la aplicación.
→ **BORRA TODOS LOS DATOS.**

### Restart stack
→ Reinicia todos los servicios **sin perder datos.**

### Reset stack (⚠️ Full Wipe)
→ Reinicia base de datos, archivos y contenedores.
→ Solo para **empezar de cero.**

### Suspend (stop containers)
→ Detiene los servicios **sin eliminarlos.**  
→ Para reanudar: usar opción 6.

### Resume (Start container)
→ Inicia nuevamente los contenedores **suspendidos.** 
→ Solo usar despues de suspender los contenedores.

### Uninstall
→ Elimina contenedores y persistencia completamente.
→ **BORRA TODOS LOS DATOS.**
→ Puedes reinstalar después.

### Exit
→ Sale del menú (los servicios siguen corriendo).

---

## 🔑 Credenciales por Defecto *(cambiar después de instalar)*

**ADMIN:**  
- Email: `superadmin@arepabuelas.com`  
- Contraseña: `arepabuelas`  

**CLIENTE:**  
- Email: `supercliente@arepabuelas.com`  
- Contraseña: `arepabuelas`  

---

## 🌐 Acceso a la Aplicación

Abrir en el navegador:  
👉 [http://localhost](http://localhost)

---

## 🧯 Problemas Comunes

### "Permission denied" en Docker
```bash
sudo usermod -aG docker $USER
```
> Luego cerrar y abrir la terminal.

### Puerto 80 ocupado
Editar `docker-compose.yml` → cambiar `80:80` por `8080:80`  
Acceder por: [http://localhost:8080](http://localhost:8080)

### Ver errores
```bash
docker logs <nombre-del-contenedor>
```

---

## ✅ ¡Listo!
Tu tienda de **arepas** está en marcha 🚀
