const express = require("express")
const router = express.Router()

let utils

/**
 * Main page rendering
 */
router.get("/", async (req, res) => {
  res.render("colors")
})

router.post("/", async (req, res) => {
  await utils.addColor(req.body.color, req.body.selectedName)

  res.sendStatus(200)
})

module.exports = (u) => {
  utils = u
  return router
}
