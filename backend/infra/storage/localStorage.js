import fs from "fs";

export const localStorageAdapter = {
  exists(filePath) {
    return fs.existsSync(filePath);
  },
  delete(filePath) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  },
  stream(filePath) {
    return fs.createReadStream(filePath);
  }
};

export default localStorageAdapter;
