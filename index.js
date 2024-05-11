const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5002;

app.use(express.json());
app.use(cookieParser())
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@ac-dczafpo-shard-00-00.ylujpzf.mongodb.net:27017,ac-dczafpo-shard-00-01.ylujpzf.mongodb.net:27017,ac-dczafpo-shard-00-02.ylujpzf.mongodb.net:27017/?ssl=true&replicaSet=atlas-ul1323-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
    });



async function run() {
    try {
        await client.connect();

        const clineCoServerCollection = client.db("cline-co-server-second").collection("services");




        // const verifyToken = async (req, res, next) =>{
        //     const token = req.cookies?.token;
        //     // const token = req.cookies.token;
        //     console.log(token)


        //     //if client dos not send token
        //     if(!token){
        //         return res.status(401).send({message: "Your are not authorized"})
        //     }


        //     // verify a token symmetric
        //     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
        //         // console.log(decoded.foo) // bar
        //         if(err){
        //             return res.status(401).send({message: "Your are not authorized"})
        //         }

        //         req.user = decoded;
        //         next();
        //     });




        // }


        const verifyToken = (req, res, next) =>{
            const token = req.cookies?.token;

            console.log('value of token in middleware:', token)

            if(!token){
                return res.status(401).send({message: "not authorized"})
            }
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
                if(err){
                    console.log(err)
                    return res.status(403).send({message: "not authorized"})
                }
                console.log('value in the token', decoded)
                req.user = decoded;
                next()
            });
            // next()
        }


        //filtering //sorting

        // sorting api formatting (desc and asc) situation-3
        //http://localhost:5002/api/v1/services?sortField=price&sortOrder=asc situation-4

        // http://localhost:5001/api/v1/services?category=Bathroom Care 

        app.get('/api/v1/services', verifyToken,   async(req, res) =>{
            try{

                let queryObj = {}
                // let sortObj = {}
                let sortOBJ = {};

                console.log(sortOBJ)

                const category = req.query.category;
                const sortField = req.query.sortField
                const sortOrder = req.query.sortOrder
                // const sortField = req.query.sortField;
                // const sortOrder = req.query.sortOrder;


                //pagination formate
                //http://localhost:5002/api/v1/services?page=1&limit=10
                const page = Number(req.query.page);
                const limit = Number(req.query.limit);
                const skip = (page - 1) * limit;
                
                if(category){
                    queryObj.category = category;
                }

                if(sortField && sortOrder){
                    sortOBJ[sortField] = sortOrder
                }

                // if(sortField && sortOrder){
                //     sortOBJ[sortField] = sortOrder;
                // }

                const cursor = clineCoServerCollection.find(queryObj).skip(skip).limit(limit).sort(sortOBJ);
                const result = await cursor.toArray();

                const total = await clineCoServerCollection.countDocuments();

                res.send({
                    result,
                    total
                })

                
            }catch(error){
                console.log(error)
            }
        })
        
        app.get('/api/v1/services/:id', async(req, res) =>{
            try{
                const id = req.params.id;
                const query = {_id: new ObjectId(id)}
                const result = await clineCoServerCollection.findOne(query);
                const total = await clineCoServerCollection.countDocuments();
                res.send({
                    result,
                    total
                });
            }catch(error){
                console.log(error)
            }
        })

        const clineBookingCollection = client.db("cline-co-server-second").collection('clineBooking')

        app.post('/api/v1/user/create-booking', async(req, res) =>{
            const booking = req.body;
            const result = await clineBookingCollection.insertOne(booking);
            res.send(result);
        })

        // user specific booking
        app.get('/api/v1/user/bookings', verifyToken,  async(req, res) =>{
            const queryEmail = req.query.email;
            const tokenEmail = req.user.email;

            // const token = req.cookies?.token;

            console.log("query email :", queryEmail);
            console.log("token email/user email :", tokenEmail);

            console.log("req user data :", req.user.data);


            if(queryEmail !== tokenEmail){
                return res.status(401).send({message: "forbidden access"})
            }


            let query = {};
            if(queryEmail){
                query.email = queryEmail
            }

            
            const result = await clineBookingCollection.find(query).toArray();
            res.send(result)

        })

        // app.get('/api/v1/user/bookings', verifyToken,  async(req, res) =>{

        //     const queryEmail = req.query.email; 
        //     const tokenEmail = req.user?.email;//undefined


        //     // const queryEmail = req.query.email;
        //     // const tokenEmail = req.user.email;

        //     console.log(queryEmail, "fined ")
        //     console.log(tokenEmail, "user email");

        //     const result = await clineBookingCollection.find().toArray();
        //     res.send(result)

        // })

        


        // app.post('/api/vi/jwt/access-token', verifyToken, async(req, res) =>{
            
        //     const user = req.body.email;
        //     console.log(user)

        //     const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        //         expiresIn: '60 * 60'
        //     })

        //     res
        //     .cookie('token', token, {
        //         httpOnly: true,
        //         secure: false,
        //         // sameSite: 'none'
        //     })
        //     .send({success: true})


        // })

        app.post('/api/v1/auth/token', verifyToken,  async(req, res) =>{
            const user = req.body.email;
            console.log( "user in the auth token :", user)

            const token = jwt.sign({
                data: user
            }, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '2h'
            })

            res
            .cookie('token', token, {
                httpOnly: true,
                secure: false,
                // sameSite: 'none'
            })
            .send({success: true})

        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) =>{
    res.send('CLINE CO SERVER RUNNING ON PORT')
})
app.listen(port, () =>{
    console.log(`Cline Co Server Running On ${port}`)
})