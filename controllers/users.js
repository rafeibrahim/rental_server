const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRouter = require('express').Router();
const User = require('../models/user');

const getTokenFrom = (request) => {
  const authorization = request.get('authorization');
  if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
    return authorization.substring(7);
  }
  return null;
};

userRouter.get('/', async (request, response) => {
  const users = await User.find({}).populate('places');
  response.json(users);
});

userRouter.get('/token', async (request, response) => {
  const token = getTokenFrom(request);
  const decodedToken = jwt.verify(token, process.env.SECRET);
  if (!token || !decodedToken.id) {
    return response.status(401).send({ error: 'token missing or invalid ' });
  }

  response.status(200).send({ token: token });
});

userRouter.post('/', async (request, response) => {
  const { email, name, password } = request.body;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return response.status(400).json({
      error: 'email must be unique',
    });
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const user = new User({
    email,
    name,
    passwordHash,
  });

  const savedUser = await user.save();

  const userForToken = {
    email: savedUser.email,
    id: savedUser._id,
  };

  // token expires in 60*60 seconds, that is, in one hour
  const token = jwt.sign(userForToken, process.env.SECRET, {
    expiresIn: 60 * 60,
  });

  //response.status(201).json(savedUser);
  response
    .status(201)
    .send({ token, email: savedUser.email, name: savedUser.name });
});

module.exports = userRouter;
