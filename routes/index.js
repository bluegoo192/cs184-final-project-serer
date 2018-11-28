var express = require('express');
var router = express.Router();
const aws = require('aws-sdk');
const uuid = require('uuid/v4');

// AWS setup
aws.config.update({region: 'us-west-2'});
const s3 = new aws.S3();
const rekognition = new aws.Rekognition();
const S3_BUCKET_NAME = 'cs184-faces-2';
const MEMBER_COLLECTION_ID = 'cs184-members';

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/createCollection', async function (req, res, next) {
    rekognition.createCollection({CollectionId: MEMBER_COLLECTION_ID}, function (err,data) {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } else {
        console.log(data);
        res.sendStatus(200);
      }
    })
});

router.post('/addMember', async function (req, res, next) {
  // Check input
  if (!req.files || !req.files.face || !req.files.face.data || !req.body.memberId) {
    res.sendStatus(400);
    return;
  }

  // Add image to S3
  const uploadParams = {
    Bucket: S3_BUCKET_NAME,
    Key: req.body.memberId,
    Body: req.files.face.data
  }
  try {
    const s3Response = await s3.putObject(uploadParams).promise();
  } catch (err) {
    res.sendStatus(500);
    console.log(err);
    return;
  }

  // Upload to Rekognition
  const params = {
    CollectionId: MEMBER_COLLECTION_ID,
    DetectionAttributes: [],
    ExternalImageId: req.body.memberId,
    Image: {
      S3Object: {
        Bucket: S3_BUCKET_NAME,
        Name: req.body.memberId
      }
    }
  };
  rekognition.indexFaces(params, function (err, data) {
    if (err) {
      res.sendStatus(500);
      console.log(err);
    } else {
      console.log(data);
      res.send(data);
    }
  })
})

router.post('/checkFace', async function (req, res, next) {
  // Check input
  if (!req.files.face || !req.files.face.data) {
    res.sendStatus(400);
    return;
  }

  // Add the image to S3
  const key = uuid();  // generate a unique key for this image
  const uploadParams = {
    Bucket: S3_BUCKET_NAME,
    Key: key,
    Body: req.files.face.data
  }
  try {
    const s3Response = await s3.putObject(uploadParams).promise();
  } catch (err) {
    res.sendStatus(500);
    console.log(err);
    return;
  }

  // Check if it is in our collection
  const params = {
    CollectionId: MEMBER_COLLECTION_ID,
    FaceMatchThreshold: 90,
    Image: {
      S3Object: {
        Bucket: S3_BUCKET_NAME,
        Name: key
      }
    },
    MaxFaces: 10
  };
  rekognition.searchFacesByImage(params, function (err, data) {
    if (err) {
      res.sendStatus(500);
      console.log(err);
    } else {
      console.log(data);
      res.send(data);
    }
  })

  // TODO: delete image from S3
});

module.exports = router;
