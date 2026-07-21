const API_URL = 'https://pafinal-production.up.railway.app';

let socket = null;


// ==============================
// LOGOUT
// ==============================
function logout() {

    localStorage.clear();

    window.location.href = 'index.html';

}



// ==============================
// INICIAR SOCKET SOLO EN PANELES
// ==============================

document.addEventListener('DOMContentLoaded', () => {


    const page = window.location.pathname;


    if(page.includes('mozo.html') || page.includes('cocinero.html')){


        socket = io(API_URL, {
            transports: ['websocket', 'polling']
        });



        socket.on('connect', ()=>{

            console.log("Socket conectado:", socket.id);

        });



        socket.on('load_orders',(orders)=>{

            console.log("Pedidos recibidos:", orders);

            renderOrders(orders);

        });



        socket.on('order_added',(order)=>{

            appendOrder(order);

        });



        socket.on('order_status_changed',(order)=>{

            updateOrderInDOM(order);

        });



    }





    // ==============================
    // LOGIN
    // ==============================


    const loginForm = document.getElementById('loginForm');


    if(loginForm){


        loginForm.addEventListener('submit', async(e)=>{


            e.preventDefault();



            const username =
                document.getElementById('username').value;


            const password =
                document.getElementById('password').value;



            const response = await fetch(`${API_URL}/api/login`,{

                method:'POST',

                headers:{
                    'Content-Type':'application/json'
                },

                body:JSON.stringify({

                    username,
                    password

                })

            });



            const data = await response.json();



            if(data.success){


                localStorage.setItem(
                    'username',
                    data.username
                );


                localStorage.setItem(
                    'role',
                    data.role
                );



                if(data.role === 'mozo'){

                    window.location.href='mozo.html';

                }else{

                    window.location.href='cocinero.html';

                }



            }else{


                document.getElementById('errorMsg').textContent =
                data.message;


            }


        });


    }




    // ==============================
    // PEDIDO MOZO
    // ==============================


    const orderForm =
    document.getElementById('order-form');



    if(orderForm){


        orderForm.addEventListener('submit',(e)=>{


            e.preventDefault();



            const mesa =
            document.getElementById('mesa').value;



            const platos =
            document.getElementById('platos').value;



            socket.emit('new_order',{

                mesa,
                platos,
                mozo:localStorage.getItem('username')

            });



            orderForm.reset();


        });


    }



});




// ==============================
// MOSTRAR PEDIDOS
// ==============================


function renderOrders(orders){


    const container =
    document.getElementById('orders-container');


    if(!container)return;



    container.innerHTML='';



    orders.forEach(order=>{

        appendOrder(order);

    });



}





function appendOrder(order){


    const container =
    document.getElementById('orders-container');


    if(!container)return;



    if(document.getElementById(`order-${order.id}`))
    return;



    const card=document.createElement('div');


    card.id=`order-${order.id}`;


    card.className='order-card';



    card.innerHTML=`

    <p><b>Mesa:</b> ${order.mesa}</p>

    <p><b>Platos:</b> ${order.platos}</p>

    <p><b>Mozo:</b> ${order.mozo}</p>

    <p>
    <b>Estado:</b>
    <span class="status">${order.estado}</span>
    </p>

    <small>${order.timestamp}</small>


    ${
        localStorage.getItem('role')==='cocinero'

        ?

        `

        <br>

        <button onclick="changeStatus('${order.id}','En Preparación')">
        Aceptar / Preparar
        </button>


        <button onclick="changeStatus('${order.id}','Listo para Servir')">
        Marcar Listo
        </button>

        `

        :''
    }

    `;



    container.prepend(card);


}




window.changeStatus=function(orderId,newStatus){


    socket.emit('update_order_status',{

        orderId,
        newStatus

    });


};





function updateOrderInDOM(order){


    const card =
    document.getElementById(`order-${order.id}`);



    if(card){


        card.querySelector('.status').textContent =
        order.estado;


    }


}
