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
// LOGIN + PEDIDOS
// ==============================

document.addEventListener('DOMContentLoaded', () => {


    // LOGIN

    const loginForm = document.getElementById('loginForm');


    if (loginForm) {


        loginForm.addEventListener('submit', async (e) => {


            e.preventDefault();


            const username =
                document.getElementById('username').value;


            const password =
                document.getElementById('password').value;


            const errorMsg =
                document.getElementById('errorMsg');



            try {


                const response = await fetch(`${API_URL}/api/login`, {


                    method: 'POST',


                    headers: {
                        'Content-Type': 'application/json'
                    },


                    body: JSON.stringify({
                        username,
                        password
                    })


                });



                const data = await response.json();



                if (response.ok && data.success) {


                    localStorage.setItem(
                        'username',
                        data.username
                    );


                    localStorage.setItem(
                        'role',
                        data.role
                    );



                    if (data.role === 'mozo') {

                        window.location.href = 'mozo.html';

                    } else {

                        window.location.href = 'cocinero.html';

                    }



                } else {


                    if(errorMsg){

                        errorMsg.textContent =
                        data.message || 'Credenciales inválidas';

                    }


                }



            } catch(error) {


                console.error(error);


                if(errorMsg){

                    errorMsg.textContent =
                    'Error de conexión con el servidor';

                }


            }



        });


    }





    // CREAR PEDIDO DEL MOZO


    const orderForm =
    document.getElementById('order-form');



    if(orderForm){


        orderForm.addEventListener('submit', (e)=>{


            e.preventDefault();



            const mesa =
            document.getElementById('mesa').value;



            const platos =
            document.getElementById('platos').value;



            const mozo =
            localStorage.getItem('username');



            socket.emit('new_order', {

                mesa,
                platos,
                mozo

            });



            orderForm.reset();


        });



    }



});




// ==============================
// SOCKETS
// ==============================


socket.on('connect', ()=>{

    console.log('Socket conectado:', socket.id);

});



socket.on('load_orders',(orders)=>{


    console.log('Pedidos cargados:', orders);


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



    container.innerHTML = '';



    orders.forEach(order=>{


        appendOrder(order);


    });



}





function appendOrder(order){


    const container =
    document.getElementById('orders-container');


    if(!container) return;



    if(document.getElementById(`order-${order.id}`)){

        return;

    }



    const card =
    document.createElement('div');



    card.id =
    `order-${order.id}`;



    card.className =
    'order-card';



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
// CAMBIAR ESTADO COCINA
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

            status.textContent =
            order.estado;

        }


    }


}
