module.exports = (objectToTest, fields) => {
  const ret = {};
  fields.forEach(field => {
    if (objectToTest[field] == null) {
      throw 'Invalid object'
    } else {
      ret[field] = objectToTest[field];
    }
  })
  return ret;
}
