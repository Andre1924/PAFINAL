// Detecta la URL del servidor automáticamente (funciona en localhost y en Railway)
const API_URL = window.location.origin;

// --- RUTAS Y PROTECCIÓN DE PÁGINAS ---
const currentPage = window.location.pathname.split('/').pop();
const currentUser = localStorage.getItem('username');
const currentRole = localStorage.getItem('role');

// Proteger rutas según el rol
if (currentPage === 'mozo.html' && currentRole !== 'mozo') window.location.href = 'index.html';
if (currentPage === 'cocinero.html' && currentRole !== 'cocinero') window.location.href = 'index.html';

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// --- LÓGICA DE LOGIN (index.html) ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            });
            const data = await response.json();

            if (data.success) {
                localStorage.setItem('username', data.username);
                localStorage.setItem('role', data.role);
                window.location.href = data.role === 'mozo' ? 'mozo.html' : 'cocinero.html';
            } else {
                document.getElementById('errorMsg').innerText = data.message;
            }
        } catch (error) {
            document.getElementById('errorMsg').innerText = 'No se pudo conectar con el servidor backend.';
        }
    });
}

// --- LÓGICA DE WEBSOCKETS (mozo.html y cocinero.html) ---
if (currentPage === 'mozo.html' || currentPage === 'cocinero.html') {
    const socket = io(API_URL);

    // Cargar pedidos iniciales desde MongoDB
    socket.on('load_orders', (orders) => {
        orders.forEach(order => renderOrder(order));
    });

    // Escuchar cuando se agrega un nuevo pedido
    socket.on('order_added', (order) => {
        renderOrder(order);
    });

    // Escuchar cuando cambia el estado de un pedido (notificación en tiempo real)
    socket.on('order_status_changed', (updatedOrder) => {
        const orderEl = document.getElementById(`order-${updatedOrder.id}`);
        if (orderEl) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(createOrderHTML(updatedOrder), 'text/html');
            const newOrderEl = doc.body.firstChild;
            
            orderEl.replaceWith(newOrderEl);
            
            if (currentRole === 'mozo' && updatedOrder.estado === 'Listo para Servir' && updatedOrder.mozo === currentUser) {
                alert(`¡NOTIFICACIÓN: El pedido de la ${updatedOrder.mesa} está Listo para Servir!`);
            }
        }
    });

    // --- Funcionalidad del Mozo ---
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const mesa = document.getElementById('mesa').value;
            const platos = document.getElementById('platos').value;
            
            socket.emit('new_order', { mesa, platos, mozo: currentUser });
            document.getElementById('platos').value = ''; 
        });
    }

    // --- Funcionalidad del Cocinero ---
    window.changeStatus = function(orderId, newStatus) {
        socket.emit('update_order_status', { orderId, newStatus });
    };
}

// --- FUNCIONES DE INTERFAZ (Renderizado) ---
function getBadgeClass(status) {
    if (status === 'Pendiente') return 'pendiente';
    if (status === 'En Preparación') return 'preparacion';
    return 'listo';
}

function createOrderHTML(order) {
    let html = `
        <div class="order-card" id="order-${order.id}">
            <h3>${order.mesa} <span class="badge ${getBadgeClass(order.estado)}">${order.estado}</span></h3>
            <p><strong>Platos:</strong> ${order.platos}</p>
            <p><small>Enviado por: ${order.mozo} a las ${order.timestamp}</small></p>
    `;

    if (currentRole === 'cocinero') {
        html += `
            <div style="margin-top: 10px;">
                ${order.estado === 'Pendiente' ? `<button onclick="changeStatus('${order.id}', 'En Preparación')">Aceptar / Preparar</button>` : ''}
                ${order.estado === 'En Preparación' ? `<button onclick="changeStatus('${order.id}', 'Listo para Servir')">Marcar como Listo</button>` : ''}
            </div>
        `;
    }
    html += `</div>`;
    return html;
}

function renderOrder(order) {
    const listId = currentRole === 'mozo' ? 'ordersList' : 'kitchenOrdersList';
    const container = document.getElementById(listId);
    
    if (container && !document.getElementById(`order-${order.id}`)) {
        container.insertAdjacentHTML('afterbegin', createOrderHTML(order));
    }
}