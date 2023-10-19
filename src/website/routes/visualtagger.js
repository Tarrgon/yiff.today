const express = require("express")
const router = express.Router()

let utils

/**
 * Main page rendering
 */
router.get("/", async (req, res) => {
  res.render("visualtagger")
})

module.exports = (u) => {
  utils = u
  return router
}
