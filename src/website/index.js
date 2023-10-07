// Dependencies
const express = require("express")
const path = require("path")

module.exports = async () => {
  console.log("Starting")
  try {
    const app = express()

    app.set("trust proxy", 1)
    app.set("views", path.join(__dirname, "views"))
    app.set("view engine", "ejs")

    // middleware setup
    app.use(express.static(path.join(__dirname, "public")))

    // routers
    app.use("/", require("./routes/main.js")())

    return app
  } catch (e) {
    console.error(e)
  }
}
