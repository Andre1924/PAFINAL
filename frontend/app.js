const API_URL = 'https://pafinal-production.up.railway.app';

const socket = io(API_URL, {
    transports: ['websocket', 'polling']
});


// ==============================
// LOGOUT
// ==============================
function logout() {
    localStorage.removeItem('username');
    localStorage.removeItem('role');

    window.location.href = 'index.html';
}


// ==============================
// USUARIO ACTUAL
// ==============================
const currentUser = localStorage.getItem('username');
const currentRole = localStorage.getItem('role');


// ==============================
// LOGIN
// ==============================
document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('loginForm');

    if (loginForm) {

        loginForm.addEventListener('submit', async function(e) {

            e.preventDefault();

            const usernameInput = document.getElementById('username').value;
            const passwordInput = document.getElementById('password').value;
            const errorMsg = document.getElementById('errorMsg');


            try {

                const response = await fetch(`${API_URL}/api/login`, {

                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify({
                        username: usernameInput,
                        password: passwordInput
                    })

                });


                const data = await response.json();


                if (response.ok && data.success) {

                    localStorage.setItem('username', data.username);
                    localStorage.setItem('role', data.role);


                    if (data.role === 'mozo') {
                        window.location.href = 'mozo.html';
                    }

                    if (data.role === 'cocinero') {
                        window.location.href = 'cocinero.html';
                    }

                } else {

                    errorMsg.textContent =
                        data.message || 'Credenciales inválidas';

                }


            } catch(error) {

                console.error(error);

                errorMsg.textContent =
                    'Error de conexión con el servidor';

            }

        });

    }



    // ==============================
    // CREAR PEDIDO (MOZO)
    // ==============================

    const orderForm = document.getElementById('order-form');


    if (orderForm) {

        orderForm.addEventListener('submit', (e)=>{

            e.preventDefault();


            const mesa = document.getElementById('mesa').value;
            const platos = document.getElementById('platos').value;


            socket.emit('new_order', {

                mesa,
                platos,
                mozo: localStorage.getItem('username')

            });


            orderForm.reset();

        });

    }


});



// ==============================
// SOCKETS
// ==============================


socket.on('load_orders', (orders)=>{

    renderOrders(orders);

});


socket.on('order_added',(order)=>{

    appendOrder(order);

});


socket.on('order_status_changed',(order)=>{

    updateOrderInDOM(order);

});




// ==============================
// MOSTRAR PEDIDOS
// ==============================


function renderOrders(orders){

    const container =
        document.getElementById('orders-container');


    if(!container) return;


    container.innerHTML='';


    orders.forEach(order=>{

        appendOrder(order);

    });

}




function appendOrder(order){


    const container =
        document.getElementById('orders-container');


    if(!container) return;



    if(document.getElementById(`order-${order.id}`))
        return;



    const card = document.createElement('div');


    card.id = `order-${order.id}`;

    card.className='order-card';



    card.innerHTML = `

        <p><strong>Mesa:</strong> ${order.mesa}</p>

        <p><strong>Platos:</strong> ${order.platos}</p>

        <p><strong>Mozo:</strong> ${order.mozo}</p>

        <p>
        <strong>Estado:</strong>
        <span class="status">
        ${order.estado}
        </span>
        </p>

        <p>
        <small>${order.timestamp}</small>
        </p>


        ${
            localStorage.getItem('role') === 'cocinero'

            ?

            `

            <button onclick="changeStatus('${order.id}','En Preparación')">
            Aceptar / Preparar
            </button>


            <button onclick="changeStatus('${order.id}','Listo para Servir')">
            Marcar Listo
            </button>

            `

            :

            ''

        }

    `;


    container.prepend(card);

}




// ==============================
// CAMBIAR ESTADO (COCINA)
// ==============================

window.changeStatus = function(orderId,newStatus){


    socket.emit('update_order_status',{

        orderId,
        newStatus

    });


};




// ==============================
// ACTUALIZAR ESTADO
// ==============================

function updateOrderInDOM(order){


    const card =
        document.getElementById(`order-${order.id}`);


    if(card){

        const status =
            card.querySelector('.status');


        if(status){

            status.textContent = order.estado;

        }

    }


}
