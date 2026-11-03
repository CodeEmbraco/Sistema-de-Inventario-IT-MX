-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 24, 2026 at 02:27 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `sis_invit`
--

-- --------------------------------------------------------

--
-- Table structure for table `archivos`
--

DROP TABLE IF EXISTS `archivos`;
CREATE TABLE `archivos` (
  `id` int(11) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `tipo` enum('CARPETA','ARCHIVO') NOT NULL,
  `extension` varchar(50) DEFAULT NULL,
  `tamaño` bigint(20) DEFAULT NULL,
  `ruta_fisica` varchar(500) DEFAULT NULL,
  `carpeta_padre_id` int(11) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `usuario_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `archivos_logs`
--

DROP TABLE IF EXISTS `archivos_logs`;
CREATE TABLE `archivos_logs` (
  `id` int(11) NOT NULL,
  `archivo_id` int(11) NOT NULL,
  `accion` enum('CREAR','EDITAR','ELIMINAR','RESTAURAR','MOVER','COPIAR','RENOMBRAR','CORTAR','PEGAR') NOT NULL,
  `detalles` text DEFAULT NULL,
  `usuario_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `camaras`
--

DROP TABLE IF EXISTS `camaras`;
CREATE TABLE `camaras` (
  `id` int(11) NOT NULL,
  `tipo` enum('CAMARA','DVR','NVR') NOT NULL,
  `dvr_id` int(11) DEFAULT NULL,
  `serial` varchar(100) DEFAULT NULL,
  `modelo` varchar(100) DEFAULT NULL,
  `marca` varchar(100) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `ubicacion` varchar(200) DEFAULT NULL,
  `imagen` varchar(500) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `usuario_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `camaras_logs`
--

DROP TABLE IF EXISTS `camaras_logs`;
CREATE TABLE `camaras_logs` (
  `id` int(11) NOT NULL,
  `camara_id` int(11) NOT NULL,
  `accion` enum('CREAR','EDITAR','ELIMINAR','ACTIVAR','DESACTIVAR') NOT NULL,
  `detalles` text DEFAULT NULL,
  `usuario_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `computadoras`
--

DROP TABLE IF EXISTS `computadoras`;
CREATE TABLE `computadoras` (
  `id` int(11) NOT NULL,
  `equipo` enum('PC','LAPTOP') NOT NULL,
  `hostname` varchar(100) NOT NULL,
  `serial` varchar(100) NOT NULL,
  `modelo` varchar(100) DEFAULT NULL,
  `marca` varchar(100) DEFAULT NULL,
  `responsable` varchar(200) NOT NULL,
  `ubicacion` varchar(200) DEFAULT NULL,
  `responsiva` varchar(300) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `usuario_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `computadoras_logs`
--

DROP TABLE IF EXISTS `computadoras_logs`;
CREATE TABLE `computadoras_logs` (
  `id` int(11) NOT NULL,
  `computadora_id` int(11) NOT NULL,
  `accion` enum('CREAR','EDITAR','ELIMINAR','ACTIVAR','DESACTIVAR') NOT NULL,
  `detalles` text DEFAULT NULL,
  `usuario_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `impresoras`
--

DROP TABLE IF EXISTS `impresoras`;
CREATE TABLE `impresoras` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `marca` varchar(100) DEFAULT NULL,
  `modelo` varchar(100) DEFAULT NULL,
  `serie` varchar(100) NOT NULL,
  `ubicacion` varchar(200) DEFAULT NULL,
  `ip` varchar(15) DEFAULT NULL,
  `foto` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `usuario_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `impresoras_logs`
--

DROP TABLE IF EXISTS `impresoras_logs`;
CREATE TABLE `impresoras_logs` (
  `id` int(11) NOT NULL,
  `impresora_id` int(11) NOT NULL,
  `accion` enum('CREAR','EDITAR','ELIMINAR','ACTIVAR','DESACTIVAR') NOT NULL,
  `detalles` text DEFAULT NULL,
  `usuario_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `portapapeles`
--

DROP TABLE IF EXISTS `portapapeles`;
CREATE TABLE `portapapeles` (
  `id` int(11) NOT NULL,
  `archivo_id` int(11) NOT NULL,
  `operacion` enum('CORTAR','COPIAR') NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expiracion` timestamp NOT NULL DEFAULT (current_timestamp() + interval 1 hour)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tarjetas_acceso`
--

DROP TABLE IF EXISTS `tarjetas_acceso`;
CREATE TABLE `tarjetas_acceso` (
  `id` int(11) NOT NULL,
  `numero_tarjeta` text DEFAULT NULL,
  `area_acceso` text NOT NULL,
  `numero_empleado` int(11) NOT NULL,
  `nombre_empleado` varchar(200) NOT NULL,
  `observaciones` text DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `usuario_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tarjetas_acceso_logs`
--

DROP TABLE IF EXISTS `tarjetas_acceso_logs`;
CREATE TABLE `tarjetas_acceso_logs` (
  `id` int(11) NOT NULL,
  `tarjeta_id` int(11) NOT NULL,
  `accion` enum('CREAR','EDITAR','ELIMINAR','ACTIVAR','DESACTIVAR') NOT NULL,
  `detalles` text DEFAULT NULL,
  `usuario_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `nombre` text NOT NULL,
  `usuario` text NOT NULL,
  `password` text NOT NULL,
  `perfil` text NOT NULL,
  `foto` text NOT NULL,
  `estado` int(11) NOT NULL,
  `ultimo_login` datetime NOT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

--
-- Dumping data for table `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `usuario`, `password`, `perfil`, `foto`, `estado`, `ultimo_login`, `fecha`) VALUES
(1, 'Administrador', 'admin', '$2y$12$XJ25Js/GEiKmvPO5ZFsOWe/YPRgtFzaDFAECo0L3gtscbueto/0WG', 'Administrador', 'vistas/img/usuarios/admin/191.png', 1, '2026-09-24 07:25:56', '2026-09-24 12:25:56');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `archivos`
--
ALTER TABLE `archivos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tipo` (`tipo`),
  ADD KEY `idx_carpeta_padre` (`carpeta_padre_id`),
  ADD KEY `idx_activo` (`activo`),
  ADD KEY `fk_archivos_usuario` (`usuario_id`);

--
-- Indexes for table `archivos_logs`
--
ALTER TABLE `archivos_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_archivo_id` (`archivo_id`),
  ADD KEY `idx_accion` (`accion`),
  ADD KEY `idx_usuario_id` (`usuario_id`);

--
-- Indexes for table `camaras`
--
ALTER TABLE `camaras`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tipo` (`tipo`),
  ADD KEY `idx_serial` (`serial`),
  ADD KEY `idx_activo` (`activo`),
  ADD KEY `fk_camaras_dvr` (`dvr_id`),
  ADD KEY `fk_camaras_usuario` (`usuario_id`);

--
-- Indexes for table `camaras_logs`
--
ALTER TABLE `camaras_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_camara_id` (`camara_id`),
  ADD KEY `idx_accion` (`accion`),
  ADD KEY `idx_usuario_id` (`usuario_id`);

--
-- Indexes for table `computadoras`
--
ALTER TABLE `computadoras`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `hostname` (`hostname`),
  ADD UNIQUE KEY `serial` (`serial`),
  ADD KEY `idx_hostname` (`hostname`),
  ADD KEY `idx_serial` (`serial`),
  ADD KEY `idx_activo` (`activo`),
  ADD KEY `fk_computadoras_usuario` (`usuario_id`);

--
-- Indexes for table `computadoras_logs`
--
ALTER TABLE `computadoras_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_computadora_id` (`computadora_id`),
  ADD KEY `idx_accion` (`accion`),
  ADD KEY `idx_usuario_id` (`usuario_id`);

--
-- Indexes for table `impresoras`
--
ALTER TABLE `impresoras`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `serie` (`serie`),
  ADD KEY `idx_serie` (`serie`),
  ADD KEY `idx_activo` (`activo`),
  ADD KEY `idx_nombre` (`nombre`),
  ADD KEY `fk_impresoras_usuario` (`usuario_id`);

--
-- Indexes for table `impresoras_logs`
--
ALTER TABLE `impresoras_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_impresora_id` (`impresora_id`),
  ADD KEY `idx_accion` (`accion`),
  ADD KEY `idx_usuario_id` (`usuario_id`);

--
-- Indexes for table `portapapeles`
--
ALTER TABLE `portapapeles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_archivo_id` (`archivo_id`),
  ADD KEY `idx_usuario_id` (`usuario_id`),
  ADD KEY `idx_expiracion` (`expiracion`);

--
-- Indexes for table `tarjetas_acceso`
--
ALTER TABLE `tarjetas_acceso`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_empleado` (`numero_empleado`),
  ADD KEY `idx_numero_tarjeta` (`numero_tarjeta`(768)),
  ADD KEY `idx_numero_empleado` (`numero_empleado`),
  ADD KEY `idx_activo` (`activo`),
  ADD KEY `fk_tarjetas_usuario` (`usuario_id`);

--
-- Indexes for table `tarjetas_acceso_logs`
--
ALTER TABLE `tarjetas_acceso_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tarjeta_id` (`tarjeta_id`),
  ADD KEY `idx_accion` (`accion`),
  ADD KEY `idx_usuario_id` (`usuario_id`);

--
-- Indexes for table `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `archivos`
--
ALTER TABLE `archivos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `archivos_logs`
--
ALTER TABLE `archivos_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `camaras`
--
ALTER TABLE `camaras`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `camaras_logs`
--
ALTER TABLE `camaras_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `computadoras`
--
ALTER TABLE `computadoras`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `computadoras_logs`
--
ALTER TABLE `computadoras_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `impresoras`
--
ALTER TABLE `impresoras`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `impresoras_logs`
--
ALTER TABLE `impresoras_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `portapapeles`
--
ALTER TABLE `portapapeles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tarjetas_acceso`
--
ALTER TABLE `tarjetas_acceso`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tarjetas_acceso_logs`
--
ALTER TABLE `tarjetas_acceso_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `archivos`
--
ALTER TABLE `archivos`
  ADD CONSTRAINT `fk_archivos_carpeta_padre` FOREIGN KEY (`carpeta_padre_id`) REFERENCES `archivos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_archivos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Constraints for table `archivos_logs`
--
ALTER TABLE `archivos_logs`
  ADD CONSTRAINT `fk_archivos_logs_archivo` FOREIGN KEY (`archivo_id`) REFERENCES `archivos` (`id`),
  ADD CONSTRAINT `fk_archivos_logs_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Constraints for table `camaras`
--
ALTER TABLE `camaras`
  ADD CONSTRAINT `fk_camaras_dvr` FOREIGN KEY (`dvr_id`) REFERENCES `camaras` (`id`),
  ADD CONSTRAINT `fk_camaras_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Constraints for table `camaras_logs`
--
ALTER TABLE `camaras_logs`
  ADD CONSTRAINT `fk_camaras_logs_camara` FOREIGN KEY (`camara_id`) REFERENCES `camaras` (`id`),
  ADD CONSTRAINT `fk_camaras_logs_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Constraints for table `computadoras`
--
ALTER TABLE `computadoras`
  ADD CONSTRAINT `fk_computadoras_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Constraints for table `computadoras_logs`
--
ALTER TABLE `computadoras_logs`
  ADD CONSTRAINT `fk_logs_computadora` FOREIGN KEY (`computadora_id`) REFERENCES `computadoras` (`id`),
  ADD CONSTRAINT `fk_logs_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Constraints for table `impresoras`
--
ALTER TABLE `impresoras`
  ADD CONSTRAINT `fk_impresoras_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Constraints for table `impresoras_logs`
--
ALTER TABLE `impresoras_logs`
  ADD CONSTRAINT `fk_logs_impresora` FOREIGN KEY (`impresora_id`) REFERENCES `impresoras` (`id`),
  ADD CONSTRAINT `fk_logs_usuario_imp` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Constraints for table `portapapeles`
--
ALTER TABLE `portapapeles`
  ADD CONSTRAINT `fk_portapapeles_archivo` FOREIGN KEY (`archivo_id`) REFERENCES `archivos` (`id`),
  ADD CONSTRAINT `fk_portapapeles_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Constraints for table `tarjetas_acceso`
--
ALTER TABLE `tarjetas_acceso`
  ADD CONSTRAINT `fk_tarjetas_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Constraints for table `tarjetas_acceso_logs`
--
ALTER TABLE `tarjetas_acceso_logs`
  ADD CONSTRAINT `fk_tarjetas_logs_tarjeta` FOREIGN KEY (`tarjeta_id`) REFERENCES `tarjetas_acceso` (`id`),
  ADD CONSTRAINT `fk_tarjetas_logs_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
