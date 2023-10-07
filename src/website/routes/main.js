const express = require("express")
const router = express.Router()

/**
 * Main page rendering
 */
router.get("/", async (req, res) => {
  res.render("index")
})

module.exports = () => {
  return router
}
