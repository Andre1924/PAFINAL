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
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['mozo', 'cocinero'], required: true }
});
const User = mongoose.model('User', userSchema);

const orderSchema = new mongoose.Schema({
    mesa: { type: String, required: true },
    platos: { type: String, required: true },
    mozo: { type: String, required: true },
    estado: { type: String, enum: ['Pendiente', 'En Preparación', 'Listo para Servir'], default: 'Pendiente' }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

// ==========================================
// CREACIÓN AUTOMÁTICA DE USUARIOS
// ==========================================
async function crearUsuariosIniciales() {
    try {
        const conteo = await User.countDocuments();
        if (conteo === 0) {
            await User.create([
                { username: 'mozo1', password: '123', role: 'mozo' },
                { username: 'chef1', password: '123', role: 'cocinero' }
            ]);
            console.log('Usuarios de prueba creados.');
        }
    } catch (err) {
        console.error('Error al verificar o crear usuarios iniciales:', err);
    }
}

// ==========================================
// RUTA DE DIAGNÓSTICO (TEMPORAL)
// ==========================================
app.get('/debug', (req, res) => {
    const info = {
        __dirname: __dirname,
        cwd: process.cwd(),
        FRONTEND_DIR: FRONTEND_DIR,
        raiz: fs.existsSync('/') ? fs.readdirSync('/') : 'no existe /',
        app: fs.existsSync('/app') ? fs.readdirSync('/app') : 'no existe /app',
        backend: fs.existsSync(__dirname) ? fs.readdirSync(__dirname) : 'no existe backend dir',
        candidatos: candidatos.map(c => ({
            ruta: c,
            existe_carpeta: fs.existsSync(c),
            existe_index: fs.existsSync(path.join(c, 'index.html'))
        }))
    };
    res.json(info);
});

// ==========================================
// RUTAS REST
// ==========================================
app.get('/', (req, res) => {
    if (FRONTEND_DIR) {
        res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
    } else {
        res.status(500).send('No se encontró el frontend. Revisa /debug para más info.');
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username, password });
        if (user) {
            res.json({ success: true, role: user.role, username: user.username });
        } else {
            res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno en el servidor' });
    }
});

// ==========================================
// WEBSOCKETS
// ==========================================
io.on('connection', async (socket) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 }).limit(20);
        const formattedOrders = orders.map(o => ({
            id: o._id,
            mesa: o.mesa,
            platos: o.platos,
            mozo: o.mozo,
            estado: o.estado,
            timestamp: o.createdAt.toLocaleTimeString()
        }));
        socket.emit('load_orders', formattedOrders);
    } catch (err) {
        console.error('Error al cargar pedidos iniciales:', err);
    }

    socket.on('new_order', async (orderData) => {
        try {
            const newOrder = new Order({
                mesa: orderData.mesa,
                platos: orderData.platos,
                mozo: orderData.mozo
            });
            await newOrder.save();
            
            io.emit('order_added', {
                id: newOrder._id,
                mesa: newOrder.mesa,
                platos: newOrder.platos,
                mozo: newOrder.mozo,
                estado: newOrder.estado,
                timestamp: newOrder.createdAt.toLocaleTimeString()
            });
        } catch (err) {
            console.error('Error al guardar el pedido:', err);
        }
    });

    socket.on('update_order_status', async (data) => {
        if (!mongoose.Types.ObjectId.isValid(data.orderId)) return;

        try {
            const updatedOrder = await Order.findByIdAndUpdate(
                data.orderId,
                { estado: data.newStatus },
                { new: true }
            );

            if (updatedOrder) {
                io.emit('order_status_changed', {
                    id: updatedOrder._id,
                    mesa: updatedOrder.mesa,
                    platos: updatedOrder.platos,
                    mozo: updatedOrder.mozo,
                    estado: updatedOrder.estado,
                    timestamp: updatedOrder.updatedAt.toLocaleTimeString()
                });
            }
        } catch (err) {
            console.error('Error al actualizar el estado:', err);
        }
    });
});

// ==========================================
// CONEXIÓN A MONGODB Y APERTURA DE PUERTO
// ==========================================
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 8080;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor activo en puerto ${PORT}`);
});

if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(async () => {
            console.log('Conectado a MongoDB Atlas');
            await crearUsuariosIniciales();
        })
        .catch(err => console.error('Error al conectar a MongoDB:', err));
} else {
    console.warn('ADVERTENCIA: La variable MONGO_URI no está definida en Railway.');
}
