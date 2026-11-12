/** Jest transformer for the `.bible` asset files: the module is just the file path (read by the mocked File). */
module.exports = {
  process(_source, filename) {
    return { code: `module.exports = ${JSON.stringify(filename)};` };
  },
};
