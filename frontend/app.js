const API_URL = 'https://pafinal-production.up.railway.app';

let socket;

function logout(){

    localStorage.removeItem('username');
    localStorage.removeItem('role');

    window.location.href='index.html';

}


document.addEventListener('DOMContentLoaded',()=>{


    socket = io(API_URL,{
        transports:['websocket','polling']
    });



    socket.on('connect',()=>{

        console.log("Socket conectado:", socket.id);

    });

    socket.on('load_orders',(orders)=>{


        const role = localStorage.getItem('role');
        const username = localStorage.getItem('username');


        if(role === 'mozo'){

            orders = orders.filter(order =>
                order.mozo === username
            );

        }



        renderOrders(orders);


    });



    socket.on('order_added',(order)=>{


        const role = localStorage.getItem('role');
        const username = localStorage.getItem('username');



        if(role === 'mozo' && order.mozo !== username){

            return;

        }



        appendOrder(order);


    });




    socket.on('order_status_changed',(order)=>{


        const role = localStorage.getItem('role');
        const username = localStorage.getItem('username');



        if(role === 'mozo' && order.mozo !== username){

            return;

        }



        updateOrderInDOM(order);


    });




    const loginForm=document.getElementById('loginForm');


    if(loginForm){


        loginForm.addEventListener('submit',async(e)=>{


            e.preventDefault();



            const username =
            document.getElementById('username').value;



            const password =
            document.getElementById('password').value;




            const response = await fetch(
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



            const data = await response.json();




            if(response.ok && data.success){


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

                mozo:
                localStorage.getItem('username')


            });



            orderForm.reset();



        });



    }



});







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





    const card =
    document.createElement('div');



    card.id =
    `order-${order.id}`;



    card.className =
    'order-card';




    let buttons='';



    if(localStorage.getItem('role') === 'cocinero'){



        if(order.estado === 'Pendiente'){


            buttons += `

            <br><br>

            <button onclick="changeStatus('${order.id}','En Preparación')">

            Aceptar / Preparar

            </button>

            `;


        }



        if(order.estado === 'En Preparación'){


            buttons += `

            <br><br>

            <button onclick="changeStatus('${order.id}','Listo para Servir')">

            Marcar como Listo

            </button>


            `;


        }


    }





    card.innerHTML = `


        <p>
        <strong>Mesa:</strong>
        ${order.mesa}
        </p>


        <p>
        <strong>Platos:</strong>
        ${order.platos}
        </p>



        <p>
        <strong>Mozo:</strong>
        ${order.mozo}
        </p>



        <p>

        <strong>Estado:</strong>

        <span class="status">

        ${order.estado}

        </span>

        </p>



        <small>

        ${order.timestamp}

        </small>



        ${buttons}


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


        card.remove();


    }



    appendOrder(order);



}
