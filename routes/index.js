var express = require('express');
var router = express.Router();
const aws = require('aws-sdk');
const uuid = require('uuid/v4');

// AWS setup
if (process.env.CS184_AWS_KEY_ID == null || process.env.CS184_AWS_SECRET_KEY == null) {
  console.error("Missing AWS credentials in config");
}
aws.config.update({
  region: 'us-west-2'
});
const s3 = new aws.S3({
  accessKeyId: process.env.CS184_AWS_KEY_ID,
  secretAccessKey: process.env.CS184_AWS_SECRET_KEY,
});
const rekognition = new aws.Rekognition({
  accessKeyId: process.env.CS184_AWS_KEY_ID,
  secretAccessKey: process.env.CS184_AWS_SECRET_KEY,
});
const S3_BUCKET_NAME = 'cs184-faces-2';
const MEMBER_COLLECTION_ID = 'cs184-members';

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

const check = (target, properties) => {
  const valid = true;
  properties.forEach(prop => {
    if (target[prop] == null) valid = false;
  });
  return valid;
}

router.post('/api/v1/createCollection', async function (req, res, next) {
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

router.post('/api/v1/addMember', async function (req, res, next) {
  // Check input
  if (!req.files || !req.files.face || !req.files.face.data) {
    res.sendStatus(400);
    return;
  }

  // Add image to S3
  const Key = uuid();  // generate a unique key for this image
  const uploadParams = {
    Bucket: S3_BUCKET_NAME,
    Key,
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
    Image: {
      S3Object: {
        Bucket: S3_BUCKET_NAME,
        Name: Key
      }
    }
  };
  try {
    const response = await rekognition.indexFaces(params).promise();
    if (response.FaceRecords.length > 1) { // too many faces
      // Send a friendly error message
      res.send({
        userError: true,
        message: `Too many faces in your picture (${response.FaceRecords.length} detected).  Please only send one face.`
      });
      // Delete the faces from the collection
      const FaceIds = [];
      response.FaceRecords.forEach(record => FaceIds.push(record.Face.FaceId));
      console.log(FaceIds)
      rekognition.deleteFaces({
        CollectionId: MEMBER_COLLECTION_ID,
        FaceIds,
      }, function (err, data) {
        if (err) console.error(err);
        if (data.DeletedFaces.length !== response.FaceRecords.length) {
          console.error("Didn't delete all faces.");
          console.error(response);
        }
      });
    } else if (response.FaceRecords.length == 0) {
      res.send({
        userError: true,
        message: "No faces detected.  Please try again"
      });
    } else {
      res.send({
        faceId: response.FaceRecords[0].Face.FaceId
      });
    }
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

router.post('/api/v1/checkFace', async function (req, res, next) {
  // Check input
  if (!req.files || !req.files.face || !req.files.face.data) {
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
