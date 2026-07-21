// app.js
const API_URL = 'https://pafinal-production.up.railway.app';

const socket = io(API_URL, {
    transports: ['websocket', 'polling']
});

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const usernameInput = document.getElementById('username').value;
            const passwordInput = document.getElementById('password').value;

            try {
                const response = await fetch(`${API_URL}/api/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username: usernameInput, password: passwordInput })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    localStorage.setItem('username', data.username || usernameInput);
                    localStorage.setItem('role', data.role);
                    
                    if (data.role === 'mozo') {
                        window.location.href = 'mozo.html';
                    } else if (data.role === 'cocinero') {
                        window.location.href = 'cocinero.html';
                    } else {
                        window.location.href = 'mozo.html';
                    }
                } else {
                    alert(data.message || 'Credenciales inválidas');
                }
            } catch (err) {
                console.error('error en la conexión:', err);
                alert('no se pudo conectar con el servidor.');
            }
        });
    }

    const orderForm = document.getElementById('order-form');
    if (orderForm) {
        orderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const mesa = document.getElementById('mesa').value;
            const platos = document.getElementById('platos').value;
            const mozo = localStorage.getItem('username') || 'mozo1';

            socket.emit('new_order', { mesa, platos, mozo });
            orderForm.reset();
        });
    }

    socket.on('load_orders', (orders) => {
        renderOrders(orders);
    });

    socket.on('order_added', (order) => {
        appendOrder(order);
    });

    socket.on('order_status_changed', (order) => {
        updateOrderInDOM(order);
    });
});

function renderOrders(orders) {
    const container = document.getElementById('orders-container');
    if (!container) return;
    container.innerHTML = '';
    orders.forEach(order => appendOrder(order));
}

function appendOrder(order) {
    const container = document.getElementById('orders-container');
    if (!container) return;
    
    const card = document.createElement('div');
    card.id = `order-${order.id}`;
    card.className = 'order-card';
    card.innerHTML = `
        <p><strong>Mesa:</strong> ${order.mesa}</p>
        <p><strong>Platos:</strong> ${order.platos}</p>
        <p><strong>Mozo:</strong> ${order.mozo}</p>
        <p><strong>Estado:</strong> <span class="status">${order.estado}</span></p>
        <p><small>${order.timestamp}</small></p>
    `;
    container.prepend(card);
}

function updateOrderInDOM(order) {
    const card = document.getElementById(`order-${order.id}`);
    if (card) {
        card.querySelector('.status').textContent = order.estado;
    }
}
