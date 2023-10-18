const COLORS = ["black", "blue", "brown", "green", "grey", "orange", "pink", "purple", "red", "tan", "teal", "white", "yellow"]

let addingNext = false
let moreLeft = true
let lastId = ""
let columns = document.getElementById("color-container")

function toTitle(text) {
  return text.toLowerCase().split("_").map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(" ")
}

function lab2rgb(lab) {
  let y = (lab[0] + 16) / 116,
    x = lab[1] / 500 + y,
    z = y - lab[2] / 200,
    r, g, b

  x = 0.95047 * ((x * x * x > 0.008856) ? x * x * x : (x - 16 / 116) / 7.787)
  y = 1.00000 * ((y * y * y > 0.008856) ? y * y * y : (y - 16 / 116) / 7.787)
  z = 1.08883 * ((z * z * z > 0.008856) ? z * z * z : (z - 16 / 116) / 7.787)

  r = x * 3.2406 + y * -1.5372 + z * -0.4986
  g = x * -0.9689 + y * 1.8758 + z * 0.0415
  b = x * 0.0557 + y * -0.2040 + z * 1.0570

  r = (r > 0.0031308) ? (1.055 * Math.pow(r, 1 / 2.4) - 0.055) : 12.92 * r
  g = (g > 0.0031308) ? (1.055 * Math.pow(g, 1 / 2.4) - 0.055) : 12.92 * g
  b = (b > 0.0031308) ? (1.055 * Math.pow(b, 1 / 2.4) - 0.055) : 12.92 * b

  return [Math.max(0, Math.min(1, r)) * 255,
  Math.max(0, Math.min(1, g)) * 255,
  Math.max(0, Math.min(1, b)) * 255
  ]
}

function rgbToHex(rgb) {
  return "#" + rgb.map(x => {
    const hex = Math.round(x).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join("")
}

async function voteOnColor(lab, colorName) {
  fetch("/colors?type=lab", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ color: lab, selectedName: colorName })
  })
}

async function getNext() {
  let colors = await (await fetch(`/colors/api/dataset?after=${lastId}`)).json()

  if (colors.length > 0) lastId = colors[colors.length - 1]._id

  if (colors.length < 100) moreLeft = false

  return colors
}

function createColorColumn(color) {
  let rgb = lab2rgb([color.l, color.a, color.b])
  let hex = rgbToHex(rgb)

  let column = document.createElement("div")
  column.classList.add("column", "is-3")

  let card = document.createElement("div")
  card.classList.add("card", "large")
  column.appendChild(card)

  let cardImageContainer = document.createElement("div")
  cardImageContainer.classList.add("card-image")
  card.appendChild(cardImageContainer)

  let cardImageDiv = document.createElement("div")
  cardImageDiv.classList.add("is-16by9", "has-text-weight-bold", "has-text-light")
  cardImageDiv.style.backgroundColor = hex
  cardImageContainer.appendChild(cardImageDiv)

  let colorHex = document.createElement("span")
  colorHex.classList.add("is-size-1-desktop", "is-size-4-touch")
  colorHex.innerText = hex
  cardImageDiv.appendChild(colorHex)

  let cardContent = document.createElement("div")
  cardContent.classList.add("card-content")
  card.appendChild(cardContent)

  let content = document.createElement("div")
  content.classList.add("columns", "is-multiline", "is-centered", "has-text-centered")

  let createColumnContent = () => {
    let cols = []

    for (let name of COLORS) {
      let c = color[name] || 0
      let col = document.createElement("div")
      col.classList.add("column", "is-half")

      let colContent = document.createElement("a")
      colContent.addEventListener("click", (e) => {
        e.preventDefault()

        voteOnColor([color.l, color.a, color.b], name)

        if (color[name]) color[name]++
        else color[name] = 1

        while (content.hasChildNodes()) {
          content.removeChild(content.firstChild)
        }

        createColumnContent()
      })

      colContent.innerText = `${toTitle(name)}: ${c}`
      col.appendChild(colContent)

      cols.push({ col, hits: c, name })
    }

    cols.sort((a, b) => {
      if (a.hits == b.hits) return a.name.localeCompare(b.name)
      return b.hits - a.hits
    })

    for (let col of cols) {
      content.appendChild(col.col)
    }
  }

  createColumnContent()

  cardContent.appendChild(content)

  return column
}

async function addNewColors() {
  if (addingNext) return
  addingNext = true
  let colors = await getNext()

  for (let color of colors) {
    columns.appendChild(createColorColumn(color))
  }

  addingNext = false
}

async function handleInfiniteScroll() {
  if (!addingNext) {
    const endOfPage = window.innerHeight + window.scrollY + 250 >= document.body.offsetHeight

    if (endOfPage) {
      await addNewColors(searchData.searchText)
    }

    if (!moreLeft) {
      window.removeEventListener("scroll", handleInfiniteScroll)
    }
  }
}

addNewColors().then(() => {
  window.addEventListener("scroll", handleInfiniteScroll)
})