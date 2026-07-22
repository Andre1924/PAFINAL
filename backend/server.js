
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');



const app = express();

const server = http.createServer(app);





app.use(cors({
    origin:"*"
}));


app.use(express.json());


const io = new Server(server,{

    cors:{

        origin:"*",

        methods:["GET","POST"]

    }

});


const userSchema = new mongoose.Schema({


    username:{

        type:String,

        required:true,

        unique:true

    },


    password:{

        type:String,

        required:true

    },


    role:{

        type:String,

        enum:[

            'mozo',

            'cocinero'

        ],

        required:true

    }


});



const User = mongoose.model(
    'User',
    userSchema
);








const orderSchema = new mongoose.Schema({


    mesa:{


        type:String,

        required:true


    },


    platos:{


        type:String,

        required:true


    },


    mozo:{


        type:String,

        required:true


    },


    estado:{


        type:String,


        enum:[

            'Pendiente',

            'En Preparación',

            'Listo para Servir'

        ],


        default:'Pendiente'


    }


},{

    timestamps:true

});



const Order = mongoose.model(
    'Order',
    orderSchema
);




async function crearUsuariosIniciales(){


    try{


        const cantidad =
        await User.countDocuments();



        if(cantidad===0){



            await User.create([


                {

                    username:'mozo1',

                    password:'123',

                    role:'mozo'

                },


                {

                    username:'chef1',

                    password:'123',

                    role:'cocinero'

                }


            ]);



            console.log(
                "Usuarios iniciales creados"
            );


        }



    }catch(error){


        console.error(
            "Error creando usuarios:",
            error
        );


    }


}




app.get('/',(req,res)=>{


    res.json({

        status:"ok",

        message:
        "Backend Domo Saltado funcionando"

    });


});







app.post('/api/login',async(req,res)=>{


    const {
        username,
        password
    } = req.body;



    try{


        const user =
        await User.findOne({

            username,

            password

        });





        if(!user){


            return res.status(401).json({

                success:false,

                message:
                "Credenciales inválidas"

            });


        }





        res.json({


            success:true,


            username:user.username,


            role:user.role


        });



    }catch(error){


        console.error(error);



        res.status(500).json({

            success:false,

            message:
            "Error interno"

        });


    }



});



io.on('connection',async(socket)=>{



    console.log(
        "Cliente conectado:",
        socket.id
    );


    try{


        const orders =
        await Order.find()
        .sort({
            createdAt:-1
        })
        .limit(50);





        const formattedOrders =
        orders.map(order=>({



            id:order._id,


            mesa:order.mesa,


            platos:order.platos,


            mozo:order.mozo,


            estado:order.estado,


            timestamp:
            new Date(order.createdAt)
            .toLocaleTimeString()



        }));





        socket.emit(
            'load_orders',
            formattedOrders
        );



    }catch(error){


        console.error(
            "Error cargando pedidos:",
            error
        );


    }



    socket.on(
        'new_order',
        async(data)=>{


        try{


            const order =
            new Order({


                mesa:data.mesa,


                platos:data.platos,


                mozo:data.mozo



            });



            await order.save();





            io.emit(
                'order_added',
                {


                    id:order._id,


                    mesa:order.mesa,


                    platos:order.platos,


                    mozo:order.mozo,


                    estado:order.estado,


                    timestamp:
                    new Date(order.createdAt)
                    .toLocaleTimeString()


                }
            );





        }catch(error){


            console.error(
                "Error guardando pedido:",
                error
            );


        }



    });




    socket.on(
        'update_order_status',
        async(data)=>{



        try{



            if(
                !mongoose.Types.ObjectId
                .isValid(data.orderId)
            ){

                return;

            }







            const updated =
            await Order.findByIdAndUpdate(


                data.orderId,


                {


                    estado:
                    data.newStatus


                },


                {


                    new:true


                }


            );







            if(updated){



                io.emit(

                    'order_status_changed',

                    {


                        id:updated._id,


                        mesa:updated.mesa,


                        platos:updated.platos,


                        mozo:updated.mozo,


                        estado:updated.estado,


                        timestamp:

                        new Date(updated.updatedAt)
                        .toLocaleTimeString()


                    }

                );



            }





        }catch(error){


            console.error(

                "Error actualizando estado:",

                error

            );


        }




    });









    socket.on(
        'disconnect',
        ()=>{


        console.log(
            "Cliente desconectado:",
            socket.id
        );


    });




});



const PORT =
process.env.PORT || 8080;



const MONGO_URI =
process.env.MONGO_URI;






if(!MONGO_URI){


    console.error(
        "Falta MONGO_URI"
    );


}else{


    mongoose.connect(MONGO_URI)


    .then(async()=>{


        console.log(
            "MongoDB conectado"
        );



        await crearUsuariosIniciales();





        server.listen(
            PORT,
            "0.0.0.0",
            ()=>{


            console.log(
                `Servidor activo puerto ${PORT}`
            );


        });



    })



    .catch(error=>{


        console.error(
            "Error MongoDB:",
            error
        );


    });



}
