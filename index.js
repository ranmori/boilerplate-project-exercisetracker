const express = require('express')
const app = express()
const cors = require('cors')
const mongoose= require('mongoose')
require('dotenv').config()

app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const UserSchema= new mongoose.Schema({
  
  username:{
    type: String,
    required:true
  }

})
const exerciseSchema= new mongoose.Schema({
  userId:{
    type: String,
    required:true
  },
  description:{
    type:String,
    required:true
  },
  duration:{
    type: Number,
    required:true
  },
  date:{
     type: Date,
     default: Date.now
  }
})
const Exercise= mongoose.model("Exercise", exerciseSchema)
const User= mongoose.model("User", UserSchema);



// api routes
app.post('/api/users', async(req, res)=>{


   try{
     const {username} = req.body
     if(!username){
      res.status(400).json({error:"log your username"})
     }
     const user= new User({
      username
     })
      const savedUser= await user.save()
      res.json({username: savedUser.username, _id: savedUser._id})
   }catch(err){
    console.log(err)
        res.status(500).json("internal server error")
   }
})
app.get('/api/users', async(req,res)=>{
  try{
    
    const users = await User.find({}, { username: 1, _id: 1 });

    res.json(users)
  }catch(err){
    console.error(err);
    res.status(500).json({error: 'Internal server error'})
  }
})
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { description, duration, date } = req.body;
    const { _id } = req.params;

    if (!description || !duration) {
      return res.json({ error: 'Required fields missing' });
    }

    const user = await User.findById(_id);
    if (!user) {
      return res.json({ error: 'User not found' });
    }

    const exercise = new Exercise({
      userId: _id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date()
    });

    const savedExercise = await exercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString()
    });

  } catch (err) {
    console.error(err);
    res.json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;

    const user = await User.findById(_id);
    if (!user) {
      return res.json({ error: 'User not found' });
    }

    let query = { userId: _id };

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    let exercisesQuery = Exercise.find(query);
    if (limit) exercisesQuery = exercisesQuery.limit(parseInt(limit));

    const exercises = await exercisesQuery.exec();

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log
    });

  } catch (err) {
    console.error(err);
    res.json({ error: 'Internal server error' });
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
