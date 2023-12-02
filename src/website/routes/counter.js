const express = require("express")
const router = express.Router()

let utils

router.get("/", async (req, res) => {
  res.render("counter")
})

module.exports = (u) => {
  utils = u
  return router
}
