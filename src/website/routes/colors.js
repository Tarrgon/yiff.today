const express = require("express")
const router = express.Router()

let utils

router.get("/", async (req, res) => {
  res.render("colors")
})

router.post("/", async (req, res) => {
  await utils.addColor(req.body.color, req.body.selectedName, req.query.type || "rgb")
  await utils.addVote(req.body.color, req.body.selectedName, req.query.type || "rgb")

  res.sendStatus(200)
})

router.get("/dataset", async (req, res) => {
  res.render("colordataset")
})

router.get("/api/dataset", async (req, res) => {
  let after = req.query.after
  let colors = await utils.getColorsAfter(after)

  return res.json(colors)
})

module.exports = (u) => {
  utils = u
  return router
}
