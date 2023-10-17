const { Db } = require("mongodb")

const ACCEPTABLE_NAMES = ["black", "blue", "brown", "green", "grey", "orange", "pink", "purple", "red", "tan", "teal", "white", "yellow"]

/** @type {Db} */
let database = null
let mod = null
let colorDatas = null

module.exports = (db) => {
  // fetch("https://api.color.pizza/v1/?list=default").then(async (response) => {
  //   let data = await response.json()

  //   colorDatas = data.colors
  // })

  database = db
  mod = {
    async addColor(colorRgb, colorName) {
      if (!ACCEPTABLE_NAMES.includes(colorName)) return

      let lab = mod.rgb2lab(colorRgb)

      // let name = mod.getNearestColorName(lab)

      await database.collection("colors").updateOne({ l: Math.floor(lab[0] * 10000000000), a: Math.floor(lab[1] * 10000000000), b: Math.floor(lab[2] * 10000000000) },
        { $inc: { [`${colorName}`]: 1 } }, { upsert: true })
    },

    async getColor(lab) {
      let color = await database.collection("colors").findOne({ l: Math.floor(lab[0] * 10000000000), a: Math.floor(lab[1] * 10000000000), b: Math.floor(lab[2] * 10000000000) })
      
      if (color) {
        color.l = lab[0]
        color.a = lab[1]
        color.b = lab[2]
      }
      
      return color
    },

    // getNearestColorName(color) {
    //   let nearestDistance = Infinity
    //   let nearestColor = null

    //   for (let colorData of colorDatas) {
    //     let dist = mod.deltaE(color, [colorData.lab.l, colorData.lab.a, colorData.lab.b])

    //     if (dist < nearestDistance) {
    //       nearestColor = colorData
    //       nearestDistance = dist
    //     }
    //   }

    //   return nearestColor.name
    // },

    // deltaE(labA, labB) {
    //   let deltaL = labA[0] - labB[0]
    //   let deltaA = labA[1] - labB[1]
    //   let deltaB = labA[2] - labB[2]
    //   let c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2])
    //   let c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2])
    //   let deltaC = c1 - c2
    //   let deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC
    //   deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH)
    //   let sc = 1.0 + 0.045 * c1
    //   let sh = 1.0 + 0.015 * c1
    //   let deltaLKlsl = deltaL / (1.0)
    //   let deltaCkcsc = deltaC / (sc)
    //   let deltaHkhsh = deltaH / (sh)
    //   let i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh
    //   return i < 0 ? 0 : Math.sqrt(i)
    // },

    rgb2lab(rgb) {
      let r = rgb[0] / 255,
        g = rgb[1] / 255,
        b = rgb[2] / 255,
        x, y, z

      r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92
      g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92
      b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92

      x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
      y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000
      z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883

      x = (x > 0.008856) ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116
      y = (y > 0.008856) ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116
      z = (z > 0.008856) ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116

      return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)]
    }
  }
  return mod
}