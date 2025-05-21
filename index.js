const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Schema definitions
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

// Models
const User = mongoose.model('User', UserSchema);
const Exercise = mongoose.model('Exercise', ExerciseSchema);

// POST /api/users - Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const user = new User({ username: req.body.username });
    const savedUser = await user.save();
    return res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'Error creating user' });
  }
});

// GET /api/users - Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({});
    return res.json(users);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'Error fetching users' });
  }
});

// POST /api/users/:_id/exercises - Add exercise for a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const userId = req.params._id;
    const { description, duration, date } = req.body;
    
    // Find the user first
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create a new exercise
    const exerciseObj = {
      userId: userId,
      description: description,
      duration: Number(duration)
    };
    
    // Handle date (use today if not provided or invalid)
    if (date && date !== '') {
      const dateObj = new Date(date);
      if (!isNaN(dateObj.getTime())) {
        exerciseObj.date = dateObj;
      } else {
        exerciseObj.date = new Date();
      }
    } else {
      exerciseObj.date = new Date();
    }
    
    const exercise = new Exercise(exerciseObj);
    await exercise.save();
    
    // Return formatted response
    return res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'Error adding exercise' });
  }
});

// GET /api/users/:_id/logs - Get exercise log for user
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const userId = req.params._id;
    let { from, to, limit } = req.query;
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Build the query
    const findConditions = { userId: userId };
    
    // Add date filters if provided
    if (from || to) {
      findConditions.date = {};
      
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) {
          findConditions.date.$gte = fromDate;
        }
      }
      
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          findConditions.date.$lte = toDate;
        }
      }
    }
    
    // Execute query
    let query = Exercise.find(findConditions);
    
    // Apply limit if valid
    if (limit) {
      const limitVal = parseInt(limit);
      if (!isNaN(limitVal)) {
        query = query.limit(limitVal);
      }
    }
    
    const exercises = await query.exec();
    
    // Format log entries
    const log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));
    
    // Build response object
    const response = {
      _id: user._id,
      username: user.username,
      count: log.length,
      log: log
    };
    
    return res.json(response);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'Error fetching logs' });
  }
});

// Database connection and server start
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/exercise-tracker';

mongoose.connect(MONGODB_URL)
  .then(() => {
    console.log('Connected to MongoDB');
    const listener = app.listen(process.env.PORT || 3000, () => {
      console.log('Your app is listening on port ' + listener.address().port);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
