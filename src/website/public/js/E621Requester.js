let WAIT_DECAY = 500

class E621Requester {
  static E621_BASE_URL = "https://e621.net"
  static REQUEST_BASE_URL = "https://search.yiff.today"
  static USER_AGENT = encodeURIComponent("Yiff Today/1.0 (by DefinitelyNotAFurry4)")

  constructor() {
    this.lastRequestTime = 0
    this.hasMore = true
    this.requesting = false
  }

  // async ping() {
  //   let res = await fetch(E621Requester.BASE_URL + `/posts.json?limit=1&_client=${E621Requester.USER_AGENT}`)
  //   if (res.ok) return true
  //   return false
  // }

  async getSlides(searchText, pageNumber) {
    this.requesting = true
    let waitTime = WAIT_DECAY - (Date.now() - this.lastRequestTime)
    WAIT_DECAY = Math.min(1000, WAIT_DECAY + 20)
    if (waitTime > 0) await wait(waitTime)
    this.lastRequestTime = Date.now()
    // if (login && login.e621Username != "" && login.e621ApiKey != "") {
    //   headers.Authorization = `Basic ${btoa(`${login.e621Username}:${login.e621ApiKey}`)}`
    // }

    let options = {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    }

    if (pageNumber == null && this._searchAfter != null) {
      options.body = JSON.stringify({
        query: searchText,
        searchAfter: this._searchAfter
      })
    } else {
      options.body = JSON.stringify({
        query: searchText
      })
    }

    let res = await fetch(E621Requester.REQUEST_BASE_URL + `/?limit=100${pageNumber != null ? `&page=${pageNumber}` : ""}&_client=${E621Requester.USER_AGENT}`, options)

    if (res.ok) {
      let data = await res.json()

      this.hasMore = data.searchAfter != null || data.posts.length == 100
      this._searchAfter = data.searchAfter
      this.requesting = false
      return data.posts.map(p => new Slide(p.id, p.rating, p.fileUrl, p.previewUrl, `${E621Requester.E621_BASE_URL}/posts/${p.id}`, p.width, p.height, new Date(p.createdAt), p.score, getMediaTypeFromFileType(p.fileType), p.md5, p.tags.flat().join(" "), p.tags))
    } else {
      this.requesting = false
      slideshowController.showError(await res.text())
    }
  }

  async getSlide(id) {
    this.requesting = true
    let waitTime = WAIT_DECAY - (Date.now() - this.lastRequestTime)
    WAIT_DECAY = Math.min(1000, WAIT_DECAY + 20)
    if (waitTime > 0) await wait(waitTime)
    this.lastRequestTime = Date.now()
    let headers = {}
    // if (login && login.e621Username != "" && login.e621ApiKey != "") {
    //   headers.Authorization = `Basic ${btoa(`${login.e621Username}:${login.e621ApiKey}`)}`
    // }

    let options = {
      headers
    }

    let res = await fetch(E621Requester.REQUEST_BASE_URL + `/?limit=1&query=id:${id}%20status%3Aany&_client=${E621Requester.USER_AGENT}`, options)

    if (res.ok) {
      let data = await res.json()

      this.requesting = false
      return data.posts.map(p => new Slide(p.id, p.rating, p.fileUrl, p.previewUrl, `${E621Requester.E621_BASE_URL}/posts/${p.id}`, p.width, p.height, new Date(p.createdAt), p.score, getMediaTypeFromFileType(p.fileType), p.md5, p.tags.flat().join(" "), p.tags))[0]
    } else {
      this.requesting = false
      slideshowController.showError(await res.text())
    }
  }
}