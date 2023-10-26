let e621WikiFetcher = {
  cache: {},
  fetchShortWiki: async (tagName) => {
    if (e621WikiFetcher.cache[tagName]) {
      return e621WikiFetcher.cache[tagName]
    }

    let res = await fetch(`https://e621.net/wiki_pages/show_or_new?title=${tagName}`)

    if (res.ok) {
      let parser = new DOMParser()
      let doc = parser.parseFromString(await res.text(), "text/html")

      let body = doc.getElementById("wiki-page-body").querySelector(".styled-dtext")

      let text = body.innerText.replace(/post #\d+/g, "").replace(/\s+/, " ").trim()

      let short = text.replace(/\.\s?([a-zA-Z0-9_])/g, (_, char) => {
        return `. ${char}`
      }).slice(0, 400)

      if (text.length > 400) {
        short += "..."
      }

      e621WikiFetcher.cache[tagName] = short

      return short
    } else {
      e621WikiFetcher.cache[tagName] = ""

      return ""
    }
  }
}