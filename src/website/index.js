// Dependencies
const { MongoClient } = require("mongodb")
const express = require("express")
const path = require("path")

module.exports = async () => {
  console.log("Starting")
  try {
    const client = new MongoClient(config.mongoDatabaseUrl)
    await client.connect()
    database = client.db(config.mongoDatabaseName)
    utils = require("./utils")(database)

    const app = express()

    app.set("trust proxy", 1)
    app.set("views", path.join(__dirname, "views"))
    app.set("view engine", "ejs")

    // middleware setup
    app.use(express.static(path.join(__dirname, "public")))

    // routers
    app.use("/", require("./routes/main.js")(utils))
    app.use("/colors", require("./routes/colors.js")(utils))

    return app
  } catch (e) {
    console.error(e)
  }
}
