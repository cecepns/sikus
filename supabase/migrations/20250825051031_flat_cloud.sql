-- Database: ptps_reporting_system

-- Create database
CREATE DATABASE IF NOT EXISTS ptps_reporting_system;
USE ptps_reporting_system;

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nama VARCHAR(255) NOT NULL,
  alamat TEXT NOT NULL,
  jabatan VARCHAR(100) NOT NULL,
  nomor_ptps VARCHAR(50) NOT NULL UNIQUE,
  kelurahan VARCHAR(100) NOT NULL,
  kecamatan VARCHAR(100) NOT NULL,
  nomor_hp VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  status ENUM('pending', 'approved') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: reports
CREATE TABLE IF NOT EXISTS reports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  uraian_kejadian TEXT NOT NULL,
  tindak_lanjut_ptps TEXT,
  tindak_lanjut_kpps TEXT,
  status ENUM('Terkirim', 'Diterima', 'Diproses', 'Selesai') DEFAULT 'Terkirim',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert default admin user
INSERT INTO users (nama, alamat, jabatan, nomor_ptps, kelurahan, kecamatan, nomor_hp, email, password, role, status)
VALUES 
('Admin PTPS', 'Alamat Admin', 'Administrator', 'ADMIN001', 'Kelurahan Admin', 'Kecamatan Admin', '081234567890', 'admin@ptps.com', '$2b$10$xqX8p5H9.TgJ5z7Kj6t8.uKjH9P5x7K9t2L4n6M8q0R3s5U7w9Y1b', 'admin', 'approved');