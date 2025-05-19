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
     required: true
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
    const users= await User.find({},'username _id')
    res.json(users)
  }catch(err){
    console.error(err);
    res.status(500).json({error: 'Internal server error'})
  }
})
app.post('/api/users/:_id/exercises', async(req, res)=>{
  try{
    const {description, duration, date}= req.body
    const {_id} = req.params
    
    if(!description || !duration){
      return res.status(400).json({error:"log your exercise"})
    }
    const user= await User.findById(_id);

    if(!user){
      res.status(404).json({error:"user not found"})

    }
    const exercise = new Exercise({
      userId: _id,
      description, 
      duration,
      date: date ? new Date(date) : new Date() 
    })
    const savedExercise= await exercise.save()

    const response= {
      username:user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
      _id: savedExercise.userId
    }
    res.json(response);
  }catch(err){
    console.error(err);
    res.status(500).json({error: "internal server error"})
  }

})
app.get('/api/users/:_id/logs', async(req, res)=>{
   try {


     const {_id}= req.params
      const {from , to , limit} = req.query

      const user= await User.findById(_id)

      if(!user){
        return res.status(404).json({error:"user not found"})
      }
      const query= {userId: _id}
      if (from || to) {
        query.date = {};
        if (from) query.date.$gte = new Date(from);
        if (to) query.date.$lte = new Date(to);
      }
      const exercises= await Exercise.find(query).limit(limit ? parseInt(limit) : 0)
      const log= exercises.map(exercise=>({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString()
      }))
      const response= {
        username: user.username,
        count: log.length,
        _id: user._id,
        log
      }
      res.json(response)

   }catch(err){
    console.error(err)
    res.status(500).json({error: "internal server error"})
   }


})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
