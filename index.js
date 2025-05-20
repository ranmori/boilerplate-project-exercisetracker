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
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST new exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;
  
    if (!description || !duration) {
      return res.status(400).json({ error: 'Required fields missing' });
    }
  
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: 'User not found' });
  
    const durationNum = parseInt(duration);
    if (isNaN(durationNum)) {
      return res.status(400).json({ error: 'Duration must be a number' });
    }
  
    let exerciseDate = date ? new Date(date) : new Date();
    if (date && isNaN(exerciseDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
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
    res.status(500).json({ error: 'Server error' });
  }
});

// GET user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params;
    let { from, to, limit } = req.query;

    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const filter = { userId: _id };
    
    if (from || to) {
      filter.date = {};
      if (from) {
        const fromDate = new Date(from);
        if (isNaN(fromDate)) return res.status(400).json({ error: 'Invalid from date' });
        filter.date.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (isNaN(toDate)) return res.status(400).json({ error: 'Invalid to date' });
        toDate.setHours(23, 59, 59, 999);
        filter.date.$lte = toDate;
      }
    }

    let query = Exercise.find(filter).select('description duration date -_id').sort({ date: 1 });

    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        query = query.limit(limitNum);
      }
    }

    const exercises = await query.exec();
    const log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date ? ex.date.toDateString() : ''
    }));

    const response = {
      _id: user._id,
      username: user.username,
      count: log.length,
      log
    };

    if (from) response.from = new Date(from).toDateString();
    if (to) response.to = new Date(to).toDateString();

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


const MONGODB_URL = process.env.MONGODB_URL;
mongoose.connect(MONGODB_URL, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(() => {
  console.log('MongoDB connected');
  // Start server only after successful DB connection
  const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Server listening on port ' + listener.address().port);
  });
})
.catch(err => {
  console.error('MongoDB connection failed:', err);
});