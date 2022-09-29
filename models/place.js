const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema({
  title: String,
  streetAddress: String,
  postCode: String,
  city: String,
  rent: String,
  description: String,
  date: Date,
  location: { latitude: String, longitude: String },
  images: [{ imageUrl: String }],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

placeSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id;
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const Place = mongoose.model('Place', placeSchema);

module.exports = Place;
