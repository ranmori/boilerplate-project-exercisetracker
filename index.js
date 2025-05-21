const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Define schemas and models
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: String
});

const ExerciseSchema = new Schema({
  userId: String,
  description: String,
  duration: Number,
  date: Date
});

const User = mongoose.model('User', UserSchema);
const Exercise = mongoose.model('Exercise', ExerciseSchema);

// Create a new user
app.post('/api/users', async (req, res) => {
  const newUser = new User({ username: req.body.username });
  try {
    const savedUser = await newUser.save();
    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Add an exercise to a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;
  
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }
    
    // Create exercise
    const exercise = new Exercise({
      userId: userId,
      description: description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date()
    });
    
    await exercise.save();
    
    // Return the expected format
    res.json({
      _id: userId,
      username: user.username,
      date: exercise.date.toDateString(),
      duration: exercise.duration,
      description: exercise.description
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Get a user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;
  
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }
    
    // Build query
    let query = { userId: userId };
    
    if (from || to) {
      query.date = {};
      if (from) {
        query.date.$gte = new Date(from);
      }
      if (to) {
        query.date.$lte = new Date(to);
      }
    }
    
    // Find exercises
    let exercises = Exercise.find(query);
    
    if (limit) {
      exercises = exercises.limit(+limit);
    }
    
    const foundExercises = await exercises.exec();
    
    // Format response
    const log = foundExercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }));
    
    res.json({
      _id: userId,
      username: user.username,
      count: log.length,
      log: log
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

const MONGODB_URL = process.env.MONGODB_URL;

mongoose.connect(MONGODB_URL)
  .then(() => {
    console.log('Connected to MongoDB');
    const listener = app.listen(process.env.PORT || 3000, () => {
      console.log('Your app is listening on port ' + listener.address().port);
    });
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
  });
