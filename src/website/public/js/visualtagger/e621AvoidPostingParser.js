let avoidPosting = {
  hasFetched: false,
  list: {},
  async fetchPage() {
    let page = await fetch("https://e621.net/help/avoid_posting")

    let parser = new DOMParser()

    let html = parser.parseFromString(await page.text(), "text/html")

    let mainContainer = html.querySelector("#a-show").querySelector(".styled-dtext")

    let blockContainer = mainContainer.querySelector("blockquote")

    let ul = blockContainer

    while (!ul.innerText.includes("Avoid posting art from these sites/publishers")) {
      ul = ul.nextElementSibling
    }

    ul = ul.nextElementSibling

    while (!ul.innerText.includes("Conditional Do Not Post")) {
      if (ul.nodeName.toUpperCase() == "UL") {
        parseList(ul, false)
      }

      ul = ul.nextElementSibling
    }

    ul = ul.nextElementSibling

    parseList(ul, true)

    avoidPosting.hasFetched = true
  },

  async getDNPStatus(artist) {
    if (!avoidPosting.hasFetched) await avoidPosting.fetchPage()

    if (artist.endsWith("_(artist)")) artist = artist.slice(0, -9)

    return avoidPosting.list[artist.toLowerCase()]
  }
}

/**
 * @param {Element} list 
 */
function parseList(list, conditional) {
  if (list.nodeName.toUpperCase() != "UL") {
    alert("Error parsing avoid posting list.")
    return
  }

  for (let listItem of list.children) {
    let line = parseLine(listItem)
    for (let name of line.names) {
      let lowerName = name.toLowerCase().split(" ").join("_")
      avoidPosting.list[lowerName] = {
        name: lowerName,
        message: line.message,
        conditional
      } 
    }
  }
}

/**
 * @param {Element} line 
 */
function parseLine(line) {
  if (line.nodeName.toUpperCase() != "LI") {
    alert("Error parsing avoid posting list.")
    return
  }

  let tokenizer = new Tokenizer(line.innerText)

  let names = []
  let message = ""

  let inMessage = false
  let curPart = ""

  let totalOpen = 0

  for (let token of tokenizer) {
    if (token.trim().length == 0) continue
    if (inMessage) {
      if (token.endsWith(")") && totalOpen == 0) {
        token = token.slice(0, -1)
      }

      totalOpen += token.split("").filter(t => t == "(").length
      totalOpen -= token.split("").filter(t => t == ")").length

      message += token + " "
    } else if (token == "/") {
      names.push(curPart.trim())
      curPart = ""
    } else if (token == "(" || token == "-") {
      names.push(curPart.trim())
      curPart = ""
      inMessage = true
    } else {
      curPart += token + " "
    }
  }

  if (curPart.trim().length != 0) {
    names.push(curPart.trim())
  }

  message = message.trim()

  return { names, message }
}

class Tokenizer {
  constructor(raw) {
    this.raw = raw
    this.split = raw.trim().replace(/\s+/g, " ").replace("\n", " ").split("")
    this.done = false
    this.index = 0
  }

  *[Symbol.iterator]() {
    while (!this.done) {
      yield this.consume()
    }
  }

  peek() {
    let token = ""
    for (let i = this.index; i < this.split.length; i++) {
      let t = this.split[i]
      if (t == " ") {
        return token
      } else {
        token += t
      }
    }
  }

  consume() {
    let token = ""
    for (let i = this.index; i < this.split.length; i++) {
      let t = this.split[i]
      if (t == " ") {
        this.index = i + 1
        this.done = this.index >= this.split.length
        return token
      } else if ((t == "/" || t == "-" || t == "(") && token.length == 0) {
        this.index = i + 1
        this.done = this.index >= this.split.length
        return t
      } else if ((t == ")")) {
        this.index = i + 1
        this.done = this.index >= this.split.length
        return token + t
      } else {
        token += t
      }
    }

    this.index = this.split.length
    this.done = true

    return token
  }
}