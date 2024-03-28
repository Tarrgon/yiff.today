const express = require("express")
const router = express.Router()

const mime = require("mime-types")

const fileUpload = require("express-fileupload")

router.use(fileUpload({
  limits: { fileSize: 1000 * 1024 * 1024 },
}))

const acceptableMimeTypes = ["image/png", "image/jpeg", "image/gif", "image/apng", "video/mp4"]

const MAX_SIZE = 100 * 1024 * 1024
const MAX_SIZE_GIF = 20 * 1024 * 1024

let utils

router.post("/", async (req, res) => {
  if (!(await utils.checkMiddlemanAuth(req.query.key))) return res.sendStatus(401)

  if (!req.files) return res.sendStatus(200)

  res.sendStatus(200)

  let uploadedFiles = 0

  for (let [fileName, file] of Object.entries(req.files)) {
    if (!acceptableMimeTypes.includes(file.mimetype) || file.size > MAX_SIZE || (file.mimetype == "image/gif" && file.size > MAX_SIZE_GIF)) continue
    uploadedFiles++
    let name = `${file.md5}.${mime.extension(file.mimetype)}`
    
    if (name.endsWith("apng")) name = `${file.md5}.png`

    file.mv(`${__dirname}/../middleman_files/${name}`)
    file.path = `${__dirname}/../middleman_files/${name}`
  }

  utils.uploadFiles(Object.values(req.files), req.query.key, req.body.source)
  utils.incrementMiddlemanUses(req.query.key, uploadedFiles)
})

router.get("/search", async (req, res) => {
  if (!(await utils.checkMiddlemanUploaderAuth(req.headers.authorization))) return res.sendStatus(401)

  let files = await utils.getMiddlemanFiles(req.query.page ? parseInt(req.query.page) - 1 : 0, req.query.limit ? parseInt(req.query.limit) : 100)

  return res.json({ posts: files })
})

router.get("/file/:md5", async (req, res) => {
  if (!(await utils.checkMiddlemanUploaderAuth(req.headers.authorization))) return res.sendStatus(401)

  let file = await utils.getFile(req.params.md5)

  if (!file) return res.sendStatus(404)

  return res.sendFile(file.path)
})

module.exports = (u) => {
  utils = u
  return router
}
