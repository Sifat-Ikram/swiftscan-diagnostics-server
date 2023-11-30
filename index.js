const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
var jwt = require('jsonwebtoken');
const port = process.env.PORT || 4321;


// middleware

app.use(cors({
  origin: ['http://localhost:5173','https://swiftscan-diagnostics.web.app','https://swiftscan-diagnostics.firebaseapp.com'],
  credentials: true,
}));
app.use(express.json());


const verifyToken = (req, res, next) => {
  console.log(req.headers);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: 'Unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })

}

const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  const isAdmin = user?.role === 'admin';
  if (!isAdmin) {
    return res.status(403).send({ message: 'Access forbidden' })
  }
  next();
}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jrqljyn.mongodb.net/?retryWrites=true&w=majority`;

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

    const serviceCollection = client.db("swiftscanDB").collection("service");
    const cartCollection = client.db("swiftscanDB").collection("cart");
    const userCollection = client.db("swiftscanDB").collection("user");
    const bannerCollection = client.db("swiftscanDB").collection("banner");
    const subDistrictCollection = client.db("swiftscanDB").collection("subDistrict");


    // jwt api
    app.post('/jwt', verifyAdmin, verifyToken, async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
      res.send({ token });
    })

    // user api
    app.post('/user', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const ifExist = await userCollection.findOne(query);
      if (ifExist) {
        return res.send({ message: 'user already exist', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    app.patch('/user/:id', async (req, res) => {
      const user = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          name: user.name,
          email: user.email,
          photo: user.photo,
          bloodGroup: user.bloodGroup,
          district: user.district
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc, options);
      res.send(result);
    })

    app.get('/user', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.get('/user/admin/:email', verifyToken, verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'unauthorized access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })

    app.delete('/user/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    app.patch('/user/admin/:id', async (req, res) => {
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


    // service api
    app.get('/service', async (req, res) => {
      const result = await serviceCollection.find().toArray();
      res.send(result);
    })

    app.post('/service', async (req, res) => {
      const test = req.body;
      const result = await serviceCollection.insertOne(test);
      res.send(result);
    })

    app.delete('/service/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.deleteOne(query);
      res.send(result);
    })

    app.patch('/service/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          title: item.title,
          price: parseFloat(item.price),
          date: item.date,
          details: item.details,
          slots: [
            {
              "id": 1,
              "time": item.time1,
              "availability": item.status1
            },
            {
              "id": 2,
              "time": item.time2,
              "availability": item.status2
            },
            {
              "id": 3,
              "time": item.time3,
              "availability": item.status3
            }
          ],
          image: item.image
        }
      }

      const result = await serviceCollection.updateOne(filter, updatedDoc, options);
      res.send(result);
    })


    // cart api
    app.post('/cart', async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    })

    app.get('/cart', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })

    app.get('/cart/admin', async (req, res) => {
      const query = req.body;
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })

    app.delete('/cart/admin/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })

    app.delete('/cart/:id', async (req, res) => {
      const id = req.params.id;
      const query = { id: new ObjectId(id) }
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })

    // banner api
    app.get('/banner', async (req, res) => {
      const query = req.body;
      const result = await bannerCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/banner', async (req, res) => {
      const bannerItem = req.body;
      const result = await bannerCollection.insertOne(bannerItem);
      res.send(result);
    })

    app.patch('/banner', async (req, res) => {
      const item = req.body;
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          title: item.title,
          text: item.text,
          image: item.image
        }
      }
      const result = await bannerCollection.updateOne(item, updatedDoc, options);
      res.send(result);
    })

    // upozila api

    app.get('/subDistrict', async (req, res) => {
      const query = req.body;
      const result = await subDistrictCollection.find(query).toArray();
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('swiftscan diagnostics is running');
})

app.listen(port, () => {
  console.log(`swiftscan diagnostics server is running through port ${port}`)
})