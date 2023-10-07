let WAIT_DECAY = 500

class E621Requester {
  static BASE_URL = "https://e621.net"
  static USER_AGENT = encodeURIComponent("Yiff Today/1.0 (by DefinitelyNotAFurry4)")

  constructor() {
    this.lastRequestTime = 0
    this.hasMore = true
  }

  static condenseTags(tags) {
    let arr = []

    for (let prop in tags) {
      arr = arr.concat(tags[prop])
    }

    return arr.join(" ")
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

    let res = await fetch(E621Requester.BASE_URL + `/posts.json?limit=100&tags=${encodeURIComponent(searchText)}&page=${pageNumber}&_client=${E621Requester.USER_AGENT}`, {
      headers
    })

    if (res.ok) {
      let data = await res.json()
      this.hasMore = data.posts.length >= 100
      data.posts = data.posts.filter(post => {
        if (!post.hasOwnProperty('id') ||
          !post.hasOwnProperty('file') ||
          !post.hasOwnProperty('preview') ||
          !post.hasOwnProperty('created_at') ||
          !post.hasOwnProperty('score') ||
          !post.hasOwnProperty('tags') ||
          !post.file.url)
          return false
        return true
      })
      return data.posts.map(p => new Slide(p.id, p.rating, p.file.url, p.preview.url, `${E621Requester.BASE_URL}/posts/${p.id}`, p.file.width, p.file.height, new Date(p.created_at), p.score, getMediaTypeFromPath(p.file.url), p.file.md5, E621Requester.condenseTags(p.tags), p.tags))
    } else {
      slideshowController.showError(await res.text())
    }
  }
}