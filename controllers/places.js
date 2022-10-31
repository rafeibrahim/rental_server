const placesRouter = require('express').Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const uuid = require('uuid').v4;
const Aws = require('aws-sdk');

// creating the storage variable to upload the file and providing the destination folder,
// if nothing is provided in the callback it will get uploaded in the main directory

// creating storage variable to to upload
// files to the memory
const storage = multer.memoryStorage({
  destination: (request, file, cb) => {
    cb(null, '');
  },
});

// below variable is defined to check
// the type of file which is uploaded
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg'
  || file.mimetype === 'image/jpg') {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// defining the upload variable for the 
// configuration of photo being uploaded
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fieldSize: 25 * 1024 * 1024 },
});

// Now creating the S3 instance which will be used in uploading photo to s3 bucket

const s3 = new Aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
});

const Place = require('../models/place');
const User = require('../models/user');

const getTokenFrom = (request) => {
  // console.log('request headers', request.headers);
  const authorization = request.get('authorization');
  // console.log('authorization', authorization);
  if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
    return authorization.substring(7);
  }
  return null;
};

placesRouter.get('/', async (request, response) => {
  const places = await Place.find({}).populate('user');
  response.json(places);
});

placesRouter.get('/:id', async (request, response) => {
  const place = await Place.findById(request.params.id);

  if (place) {
    response.json(place.toJSON());
  } else {
    response.status(404).end();
  }
});

placesRouter.post(
  '/',
  // upload.array('rentalPlaceImage', 5),
  async (request, response) => {
    // to check the data in the console that is being uploaded
    console.log('files', request.files);
    console.log('body', request.body);

    const token = getTokenFrom(request);
    // console.log('token from post places', token);
    const decodedToken = jwt.verify(token, process.env.SECRET);
    if (!token || !decodedToken.id) {
      return response.status(401).send({ error: 'token missing or invalid ' });
    }

    const params = request.files.map((file) => ({
      // bucket that we made earlier
      Bucket: process.env.AWS_BUCKET_NAME,
      // Name of the image
      Key: `${uuid()}-${file.originalname}`,
      // Body which will contain the image in buffer format
      Body: file.buffer,
      // defining the permissions to get the public link
      ACL: 'public-read-write',
      // Necessary to define the image content-type to view
      // the photo in the browser with the link
      ContentType: 'image/jpeg',
    }));

    const results = await Promise.all(
      params.map((param) => s3.upload(param).promise())
    );

    console.log(results);

    const imageUrlsArray = results.map((result) => ({
      imageUrl: result.Location,
    }));

    // console.log('imageUrlsArray', imageUrlsArray);

    // return response.status(401).json({
    //   error: 'no further process. route implementation paused by admin',
    // });

    const {
      title,
      streetAddress,
      postCode,
      city,
      rent,
      description,
      latitude,
      longitude,
    } = request.body;

    const user = await User.findById(decodedToken.id);

    const place = new Place({
      title: title,
      streetAddress: streetAddress,
      postCode: postCode,
      city: city,
      rent: rent,
      description: description,
      date: new Date(),
      location: {
        latitude: latitude,
        longitude: longitude,
      },
      images: imageUrlsArray,
      user: user._id,
    });

    const savedPlace = await place.save();
    user.places = user.places.concat(savedPlace._id);
    await user.save();

    response.status(201).json(savedPlace);
  }
);

placesRouter.delete('/:id', async (request, response) => {
  await Place.findByIdAndRemove(request.params.id);
  response.status(204).end();
});

placesRouter.put('/:id', async (request, response, next) => {
  const { title, city, address, price } = request.body;

  const place = {
    title: title,
    city: city,
    address: address,
    price: price,
  };

  try {
    const updatedPlace = await Place.findByIdAndUpdate(
      request.params.id,
      place,
      { new: true }
    );
    response.json(updatedPlace);
  } catch (error) {
    next(error);
  }
});

module.exports = placesRouter;

// const stored = s3.upload(params, (error, data) => {
//   if (error) {
//     console.log('s3 error', error);
//     return response.status(500).send({
//       error: error.message,
//     });
//   }
//   // this will give the information about the object in which photo is stored
//   console.log('dataof', index, data);
//   return data;
// });
