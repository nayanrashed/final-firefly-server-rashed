const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;

//middlewares
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.oz2ylzg.mongodb.net/?retryWrites=true&w=majority  `;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const userCollection = client.db("fireflyDb").collection("users")
        const postCollection = client.db("fireflyDb").collection("posts")
        const commentCollection = client.db("fireflyDb").collection("comments")
        const announcementCollection = client.db("fireflyDb").collection("announcements")

        //JWT related API
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '24h' })
            res.send({ token });
        })

        //middlewares
        const verifyToken = (req, res, next) => {
            // console.log('inside verify token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: "unauthorized access" });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: "unauthorized access" })
                }
                req.decoded = decoded;
                next();
            })
        };
        //use verify admin after verifyToken
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: "forbidden access" });
            }
            next();
        }

        //USER Related API
        //read all USERS data
        app.get('/users', verifyToken, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });
        //getting Users data by email
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await userCollection.findOne(query);
            res.send(result);
        })

        // getting user admin
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: "forbidden access" })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query);
            let isAdmin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin })
        })

        //create USER 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result)
        });
        //patch in USER data
        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })
        //delete USER
        //if get time i will add to client side
        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })

        // ANNOUNCEMENT related API
        app.get('announcements', async (req, res) => {
            const result = await announcementCollection.find().toArray();
            res.send(result);
        })

        app.post('/announcements', verifyToken, async (req, res) => {
            const item = req.body;
            const result = await announcementCollection.insertOne(item);
            res.send(result)
        })



        //POSTS related API 
        // Getting POST data by id
        app.get('/posts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await postCollection.findOne(query);
            res.send(result);
        });
        // Getting POSTS data by tags and by id
        app.get('/posts/:tags', async (req, res) => {
            const tags = req.params.tags;
            const query = { tags: tags };
            const result = await postCollection.find(query).toArray();
            res.send(result);
        });

        // Getting all POSTS or POSTS data by email
        app.get('/posts', async (req, res) => {
            if (req.query.email) {
                // If email parameter is present, filter by email
                const email = req.query.email;
                const query = { authorEmail: email };
                const result = await postCollection.find(query).toArray();
                res.send(result);
            } else {
                // Otherwise, get all posts
                const result = await postCollection.find().toArray();
                res.send(result);
            }
        });

        

        


        //Delete a POST
        app.delete('/posts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await postCollection.deleteOne(query)
            res.send(result);
        })

        //getting POSTS data by query email
        // app.get('/posts', async (req, res) => {
        //     const email = req.query.email;
        //     const query = { email: email };
        //     const result = await postCollection.find(query).toArray();
        //     res.send(result);
        // })
        //getting all POSTS
        // app.get('/posts', async (req, res) => {
        //     const result = await postCollection.find().toArray();
        //     res.send(result);
        // })
        // //getting POSTS data by tags
        // app.get('/posts/:tags', async (req, res) => {
        //     const tags = req.params.tags;
        //     const query = { tags: tags };
        //     const result = await postCollection.find(query).toArray();
        //     res.send(result);
        // })
        // //getting POSTS data by email
        // app.get('/posts', async (req, res) => {
        //     const email = req.query.email;
        //     const query = { authorEmail: email };
        //     const result = await postCollection.find(query).toArray();
        //     res.send(result);
        // })

        // //getting POST data by id
        // app.get('/posts/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const query = { _id: new ObjectId(id) }
        //     const result = await postCollection.findOne(query)
        //     res.send(result);
        // })

        // //posting POSTS
        // app.post('/posts', verifyToken, async (req, res) => {
        //     const post = req.body;
        //     const result = await postCollection.insertOne(post);
        //     res.send(result)
        // })




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('final firefly server is running....')
})
app.listen(port, () => {
    console.log(`firefly server is running on port ${port}`);
})