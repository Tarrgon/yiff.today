let WAIT_DECAY = 500

class E621Requester {
  static E621_BASE_URL = "https://e621.net"
  static REQUEST_BASE_URL = "https://search.yiff.today"
  static USER_AGENT = encodeURIComponent("Yiff Today/1.0 (by DefinitelyNotAFurry4)")

  constructor() {
    this.lastRequestTime = 0
    this.hasMore = true
  }

  // async ping() {
  //   let res = await fetch(E621Requester.BASE_URL + `/posts.json?limit=1&_client=${E621Requester.USER_AGENT}`)
  //   if (res.ok) return true
  //   return false
  // }

  async getSlides(searchText, pageNumber) {
    let waitTime = WAIT_DECAY - (Date.now() - this.lastRequestTime)
    WAIT_DECAY = Math.min(1000, WAIT_DECAY + 20)
    if (waitTime > 0) await wait(waitTime)
    this.lastRequestTime = Date.now()
    let headers = {}
    if (login && login.e621Username != "" && login.e621ApiKey != "") {
      headers.Authorization = `Basic ${btoa(`${login.e621Username}:${login.e621ApiKey}`)}`
    }

    let res = await fetch(E621Requester.REQUEST_BASE_URL + `/?limit=100&query=${encodeURIComponent(searchText)}&page=${pageNumber}&_client=${E621Requester.USER_AGENT}`, {
      headers
    })

    if (res.ok) {
      let data = await res.json()
      this.hasMore = data.length >= 100
      return data.map(p => new Slide(p.id, p.rating, p.fileUrl, p.previewUrl, `${E621Requester.E621_BASE_URL}/posts/${p.id}`, p.width, p.height, new Date(p.createdAt), p.score, getMediaTypeFromFileType(p.fileType), p.file.md5, p.tags.flat(), p.tags))
    } else {
      slideshowController.showError(await res.text())
    }
  }
}