require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// ==========================================
// DETECCIÓN AUTOMÁTICA DE LA CARPETA FRONTEND
// ==========================================
const candidatos = [
    path.join(__dirname, '..', 'frontend'),
    path.join(__dirname, 'frontend'),
    path.join(process.cwd(), 'frontend'),
    path.join(process.cwd(), '..', 'frontend'),
    '/app/frontend',
    '/frontend'
];

let FRONTEND_DIR = null;
for (const candidato of candidatos) {
    if (fs.existsSync(path.join(candidato, 'index.html'))) {
        FRONTEND_DIR = candidato;
        break;
    }
}

console.log('__dirname:', __dirname);
console.log('process.cwd():', process.cwd());
console.log('Candidatos probados:', candidatos);
console.log('FRONTEND_DIR encontrado:', FRONTEND_DIR);

if (FRONTEND_DIR) {
    app.use(express.static(FRONTEND_DIR));
} else {
    console.error('ADVERTENCIA: No se encontró la carpeta frontend en ninguna ruta candidata.');
}

const io = new Server(server, {
    cors: { 
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ==========================================
// MODELOS DE DATOS (Schemas de Mongoose)
// ==========================================
const userSchema = new
