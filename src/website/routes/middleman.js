const express = require("express")
const router = express.Router()

const fileUpload = require("express-fileupload")

router.use(fileUpload({
  limits: { fileSize: 100 * 1024 * 1024 },
}));

let utils

router.post("/", async (req, res) => {
  for (let [fileName, file] of Object.values(req.files)) {
    console.log(fileName, file)
  }
})

module.exports = (u) => {
  utils = u
  return router
}
