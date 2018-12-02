const redis = require("redis");
const {promisify} = require('util');
if (process.env.CS184_REDIS_PASS == null) {
  console.error("Invalid redis config");
}
const client = redis.createClient({
  host: "redis-14137.c60.us-west-1-2.ec2.cloud.redislabs.com",
  port: 14137,
  password: process.env.CS184_REDIS_PASS
});

const wrapper = {
  get: promisify(client.get).bind(client),
  set: promisify(client.set).bind(client),
}

module.exports = wrapper;
