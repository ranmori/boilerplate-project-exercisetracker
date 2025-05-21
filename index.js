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

// Define schemas
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const ExerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Exercise = mongoose.model('Exercise', ExerciseSchema);

// POST new user
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const user = new User({ username });
    const savedUser = await user.save();
    
    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST new exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params;
    let { description, duration, date } = req.body;
  
    if (!description || !duration) {
      return res.status(400).json({ error: 'Description and duration are required' });
    }
  
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
  
    const durationNum = Number(duration);
    if (isNaN(durationNum)) {
      return res.status(400).json({ error: 'Duration must be a number' });
    }
  
    let exerciseDate;
    if (!date || date === '') {
      exerciseDate = new Date();
    } else {
      exerciseDate = new Date(date);
      if (isNaN(exerciseDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
    }
  
    const exercise = new Exercise({
      userId: _id,
      description,
      duration: durationNum,
      date: exerciseDate
    });
    
    await exercise.save();
  
    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params;
    let { from, to, limit } = req.query;

    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const filter = { userId: _id };
    
    if (from || to) {
      filter.date = {};
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) {
          filter.date.$gte = fromDate;
        }
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999); // End of the day
          filter.date.$lte = toDate;
        }
      }
    }

    let query = Exercise.find(filter).sort({ date: 1 });

    if (limit) {
      const limitNum = Number(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        query = query.limit(limitNum);
      }
    }

    const exercises = await query.exec();
    
    const log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));

    const response = {
      _id: user._id,
      username: user.username,
      count: log.length,
      log: log
    };

    // Add from and to dates to response if provided
    if (from && !isNaN(new Date(from).getTime())) {
      response.from = new Date(from).toDateString();
    }
    
    if (to && !isNaN(new Date(to).getTime())) {
      response.to = new Date(to).toDateString();
    }

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/exercise-tracker';
mongoose.connect(MONGODB_URL, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(() => {
  console.log('MongoDB connected');
  const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Server listening on port ' + listener.address().port);
  });
})
.catch(err => {
  console.error('MongoDB connection failed:', err);
});
