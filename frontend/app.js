const API_URL = 'https://pafinal-production.up.railway.app';

let socket;


// ==============================
// LOGOUT
// ==============================

function logout(){

    localStorage.removeItem('username');
    localStorage.removeItem('role');

    window.location.href='index.html';

}



// ==============================
// INICIO
// ==============================

document.addEventListener('DOMContentLoaded',()=>{


    socket = io(API_URL,{
        transports:['websocket','polling']
    });



    socket.on('connect',()=>{

        console.log("Socket conectado:",socket.id);

    });



    socket.on('load_orders',(orders)=>{

        console.log("Pedidos cargados:",orders);

        renderOrders(orders);

    });



    socket.on('order_added',(order)=>{

        appendOrder(order);

    });



    socket.on('order_status_changed',(order)=>{

        updateOrderInDOM(order);

    });





    // ==========================
    // LOGIN
    // ==========================


    const loginForm=document.getElementById('loginForm');


    if(loginForm){


        loginForm.addEventListener('submit',async(e)=>{


            e.preventDefault();


            const username=
            document.getElementById('username').value;


            const password=
            document.getElementById('password').value;



            const response=await fetch(
                `${API_URL}/api/login`,
                {
                    method:'POST',
                    headers:{
                        'Content-Type':'application/json'
                    },
                    body:JSON.stringify({
                        username,
                        password
                    })
                }
            );



            const data=await response.json();



            if(response.ok && data.success){


                localStorage.setItem(
                    'username',
                    data.username
                );


                localStorage.setItem(
                    'role',
                    data.role
                );



                if(data.role==='mozo')
                    window.location.href='mozo.html';
                else
                    window.location.href='cocinero.html';



            }else{


                document.getElementById('errorMsg').textContent =
                data.message;


            }


        });


    }





    // ==========================
    // CREAR PEDIDO
    // ==========================


    const orderForm=
    document.getElementById('order-form');



    if(orderForm){


        orderForm.addEventListener('submit',(e)=>{


            e.preventDefault();


            const mesa=
            document.getElementById('mesa').value;


            const platos=
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


    const container=
    document.getElementById('orders-container');


    if(!container)return;


    container.innerHTML='';



    orders.forEach(order=>{

        appendOrder(order);

    });


}






function appendOrder(order){


    const container=
    document.getElementById('orders-container');


    if(!container)return;



    if(document.getElementById(`order-${order.id}`))
        return;



    const card=document.createElement('div');


    card.id=`order-${order.id}`;

    card.className='order-card';



    card.innerHTML=`

        <p><strong>Mesa:</strong> ${order.mesa}</p>

        <p><strong>Platos:</strong> ${order.platos}</p>

        <p><strong>Mozo:</strong> ${order.mozo}</p>


        <p>
        <strong>Estado:</strong>
        <span class="status">
        ${order.estado}
        </span>
        </p>


        <small>${order.timestamp}</small>



        ${
            localStorage.getItem('role')==='cocinero'

            ?

            `

            <br><br>

            ${
                order.estado==='Pendiente'

                ?

                `
                <button onclick="changeStatus('${order.id}','En Preparación')">
                Aceptar / Preparar
                </button>
                `

                :

                ''

            }



            ${
                order.estado==='En Preparación'

                ?

                `
                <button onclick="changeStatus('${order.id}','Listo para Servir')">
                Marcar como Listo
                </button>
                `

                :

                ''

            }


            `

            :

            ''

        }



    `;



    container.prepend(card);


}







// ==============================
// CAMBIAR ESTADO
// ==============================


window.changeStatus=function(orderId,newStatus){


    socket.emit('update_order_status',{

        orderId,
        newStatus

    });


};








function updateOrderInDOM(order){


    const card=
    document.getElementById(`order-${order.id}`);



    if(card){


        const status=
        card.querySelector('.status');


        if(status)
            status.textContent=order.estado;



    }


}
