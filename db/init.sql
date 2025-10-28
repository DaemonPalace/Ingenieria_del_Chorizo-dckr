-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Switch to arepabuelasdb for the rest of the schema (assuming POSTGRES_DB=arepabuelasdb)
-- Note: The entrypoint script handles database switching, so this might not be needed here
-- but included for clarity if manually run
\c arepabuelasdb

-- ==========================================================
--   ENUM: ROL DE USUARIO
-- ==========================================================
CREATE TYPE rol_usuario AS ENUM ('cliente', 'admin', 'superadmin');

-- ==========================================================
--   TABLA: USUARIO
-- ==========================================================
CREATE TABLE Usuario (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    correo VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    foto_url TEXT NOT NULL,
    rol rol_usuario DEFAULT 'cliente' NOT NULL,
    aprobado BOOLEAN DEFAULT FALSE,
    aprobado_por INT REFERENCES Usuario(id_usuario)
        ON DELETE SET NULL ON UPDATE CASCADE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
--   TABLA: PRODUCTO
-- ==========================================================
CREATE TABLE Producto (
    id_producto SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion VARCHAR(1000),
    precio NUMERIC(10,2) NOT NULL,
    stock INT DEFAULT 0,
    imagen_url TEXT NOT NULL, -- URL o ruta a la imagen
    activo BOOLEAN DEFAULT TRUE
);

-- ==========================================================
--   TABLA: PEDIDO
-- ==========================================================
CREATE TABLE Pedido (
    id_pedido SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES Usuario(id_usuario)
        ON DELETE CASCADE ON UPDATE CASCADE,
    fecha_pedido DATE DEFAULT CURRENT_DATE,
    estado VARCHAR(50) DEFAULT 'pendiente',
    total NUMERIC(10,2) DEFAULT 0.00
);

-- ==========================================================
--   TABLA: DETALLEPEDIDO
-- ==========================================================
CREATE TABLE DetallePedido (
    id_detalle SERIAL PRIMARY KEY,
    id_pedido INT NOT NULL REFERENCES Pedido(id_pedido)
        ON DELETE CASCADE ON UPDATE CASCADE,
    id_producto INT NOT NULL REFERENCES Producto(id_producto)
        ON DELETE CASCADE ON UPDATE CASCADE,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0)
);

-- ==========================================================
--   TABLA: DESCUENTO
-- ==========================================================
CREATE TABLE Descuento (
    id_descuento SERIAL PRIMARY KEY,
    nombre_promo VARCHAR(100) NOT NULL,
    porcentaje NUMERIC(5,2) CHECK (porcentaje >= 0 AND porcentaje <= 100),
    fecha_inicio DATE,
    fecha_fin DATE,
    tipo VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE
);

-- ==========================================================
--   TABLA: FAVORITO (Usuario ↔ Producto)
-- ==========================================================
CREATE TABLE Favorito (
    id_favorito SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES Usuario(id_usuario)
        ON DELETE CASCADE ON UPDATE CASCADE,
    id_producto INT NOT NULL REFERENCES Producto(id_producto)
        ON DELETE CASCADE ON UPDATE CASCADE,
    fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_usuario, id_producto)
);

-- ==========================================================
--   TABLA: HISTORIAL DE BÚSQUEDA
-- ==========================================================
CREATE TABLE HistorialBusqueda (
    id_busqueda SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES Usuario(id_usuario)
        ON DELETE CASCADE ON UPDATE CASCADE,
    termino_bus VARCHAR(255) NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
--   TABLA: COMENTARIO (Usuario ↔ Producto)
-- ==========================================================
CREATE TABLE Comentario (
    id_comentario SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES Usuario(id_usuario)
        ON DELETE CASCADE ON UPDATE CASCADE,
    id_producto INT NOT NULL REFERENCES Producto(id_producto)
        ON DELETE CASCADE ON UPDATE CASCADE,
    comentario TEXT NOT NULL,
    calificacion INT CHECK (calificacion BETWEEN 1 AND 5),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
--   TABLA: PAGOS SIMULADOS (reemplazo de TARJETA)
-- ==========================================================
CREATE TABLE PagoSimulado (
    id_pago SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES Usuario(id_usuario)
        ON DELETE CASCADE ON UPDATE CASCADE,
    id_pedido INT NOT NULL REFERENCES Pedido(id_pedido)
        ON DELETE CASCADE ON UPDATE CASCADE,
    metodo VARCHAR(50) DEFAULT 'tarjeta',
    estado VARCHAR(50) DEFAULT 'exitoso',
    referencia VARCHAR(100), -- código del backend (Stripe, PayPal, etc.)
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
--   RELACIÓN ENTRE DESCUENTO Y PRODUCTO (N:M)
-- ==========================================================
CREATE TABLE ProductoDescuento (
    id_producto INT REFERENCES Producto(id_producto)
        ON DELETE CASCADE ON UPDATE CASCADE,
    id_descuento INT REFERENCES Descuento(id_descuento)
        ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (id_producto, id_descuento)
);

-- ==========================================================
--   TABLA CUPONES
-- ==========================================================
CREATE TABLE Cupon (
    id_cupon SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    descuento NUMERIC(5,2) CHECK (descuento >= 0 AND descuento <= 100),
    fecha_expiracion DATE,
    usado BOOLEAN DEFAULT FALSE,
    id_usuario INT REFERENCES Usuario(id_usuario)
        ON DELETE SET NULL ON UPDATE CASCADE
);

-- ==========================================================
--   TABLA TARJETA SIMULADA
-- ==========================================================
CREATE TABLE TarjetaSimulada (
    id_tarjeta SERIAL PRIMARY KEY,
    id_usuario INT REFERENCES Usuario(id_usuario)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ultimos_4_digitos VARCHAR(4), -- Solo últimos 4 dígitos
    tipo VARCHAR(20), -- Visa, MasterCard
    nombre_titular VARCHAR(255),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
--   VISTA: HISTORIAL DE COMPRAS POR USUARIO
-- ==========================================================
CREATE VIEW HistorialCompras AS
SELECT 
    u.nombre AS usuario,
    p.id_pedido,
    p.fecha_pedido,
    p.estado,
    dp.id_producto,
    pr.nombre AS producto,
    dp.cantidad,
    dp.subtotal,
    p.total
FROM Usuario u
JOIN Pedido p ON u.id_usuario = p.id_usuario
JOIN DetallePedido dp ON p.id_pedido = dp.id_pedido
JOIN Producto pr ON dp.id_producto = pr.id_producto;

-- ==========================================================
--   COMENTARIOS Y DOCUMENTACIÓN
-- ==========================================================
COMMENT ON TABLE Usuario IS 'Almacena la información de los usuarios registrados y administradores.';
COMMENT ON COLUMN Usuario.aprobado IS 'Indica si el usuario fue aprobado por un administrador';

COMMENT ON TABLE Producto IS 'Contiene los productos disponibles en el e-commerce.';
COMMENT ON TABLE Pedido IS 'Registra los pedidos realizados por los usuarios.';
COMMENT ON TABLE DetallePedido IS 'Asocia productos con pedidos (N:M) y calcula subtotales.';
COMMENT ON TABLE Descuento IS 'Define descuentos por producto o por pedido.';
COMMENT ON TABLE Favorito IS 'Relaciona usuarios con sus productos favoritos.';
COMMENT ON TABLE HistorialBusqueda IS 'Registra los términos buscados por cada usuario.';
COMMENT ON TABLE Comentario IS 'Almacena comentarios y calificaciones por producto.';
COMMENT ON TABLE PagoSimulado IS 'Registra pagos simulados, sin almacenar información sensible.';
COMMENT ON TABLE TarjetaSimulada IS 'Almacena datos simulados de tarjetas (solo últimos 4 dígitos).';
COMMENT ON TABLE ProductoDescuento IS 'Relaciona productos con descuentos aplicables.';
COMMENT ON TABLE Cupon IS 'Cupones de descuento asignados a usuarios.';

-- ==========================================================
--   ÍNDICES PARA MEJORAR RENDIMIENTO
-- ==========================================================
CREATE INDEX idx_usuario_correo ON Usuario(correo);
CREATE INDEX idx_usuario_rol ON Usuario(rol);
CREATE INDEX idx_producto_activo ON Producto(activo);
CREATE INDEX idx_pedido_usuario ON Pedido(id_usuario);
CREATE INDEX idx_pedido_estado ON Pedido(estado);
CREATE INDEX idx_detalle_pedido ON DetallePedido(id_pedido);
CREATE INDEX idx_comentario_producto ON Comentario(id_producto);
CREATE INDEX idx_favorito_usuario ON Favorito(id_usuario);
CREATE INDEX idx_cupon_codigo ON Cupon(codigo);

-- ==========================================================
--   TRIGGERS Y FUNCIONES 
-- ==========================================================

-- Función para actualizar el total del pedido automáticamente
CREATE OR REPLACE FUNCTION actualizar_total_pedido()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE Pedido 
    SET total = (
        SELECT COALESCE(SUM(subtotal), 0) 
        FROM DetallePedido 
        WHERE id_pedido = NEW.id_pedido
    )
    WHERE id_pedido = NEW.id_pedido;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que se ejecuta después de insertar o actualizar DetallePedido
CREATE TRIGGER trg_actualizar_total
AFTER INSERT OR UPDATE OR DELETE ON DetallePedido
FOR EACH ROW
EXECUTE FUNCTION actualizar_total_pedido();

-- Función para validar que solo admins aprueben usuarios
CREATE OR REPLACE FUNCTION validar_aprobacion_admin()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.aprobado = TRUE AND NEW.aprobado_por IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM Usuario 
            WHERE id_usuario = NEW.aprobado_por 
            AND rol IN ('admin', 'superadmin')
        ) THEN
            RAISE EXCEPTION 'Solo administradores pueden aprobar usuarios';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar aprobación por admin
CREATE TRIGGER trg_validar_aprobacion
BEFORE UPDATE ON Usuario
FOR EACH ROW
EXECUTE FUNCTION validar_aprobacion_admin();

-- trigger para sincronizar con auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.Usuario (
    id_usuario,
    auth_id,
    correo,
    nombre,
    rol,
    aprobado
  )
  VALUES (
    gen_random_uuid(),
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
    'cliente',
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create auth schema for user authentication
CREATE SCHEMA IF NOT EXISTS auth;

-- Create auth.users table to store user authentication data
CREATE TABLE auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    raw_user_meta_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================================
--   CREAR SUPER ADMIN POR DEFECTO (si no existe)
-- ==========================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM Usuario WHERE correo = 'superadmin@arepabuelas.com'
    ) THEN
        INSERT INTO Usuario (
            nombre,
            correo,
            password_hash,
            foto_url,
            rol,
            aprobado,
            fecha_registro
        ) VALUES (
            'Super Admin',
            'superadmin@arepabuelas.com',
            '$2b$10$S1VlRRgqBmYI0aP3tBQ/x.VfwsIV8Si3TFB/0ebaFHLr5UN/PPiua', -- bcrypt hash
            'http://minio:9000/arepabuelas-users/camaronmacuil.jpg',
            'superadmin',
            TRUE,
            CURRENT_TIMESTAMP
        );
    END IF;
END;
$$ LANGUAGE plpgsql;