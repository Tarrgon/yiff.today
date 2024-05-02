class MiddlemanRequester {
  static REQUEST_BASE_URL = "https://yiff.today/upload_middleman/search"

  constructor() {
    this.hasMore = true
    this.requesting = false
    this.currentPage = 1
  }

  async getSlides(text, pageNumber) {
    this.currentPage = pageNumber
    this.requesting = true

    if (!middlemanAPIKey) await new Promise(r => setTimeout(r, 1000))

    let artist = text.replace("middleman", "").trim()

    let res = await fetch(MiddlemanRequester.REQUEST_BASE_URL + `/?limit=100${pageNumber != null ? `&page=${pageNumber}` : ""}${artist.length > 0 ? `&artist=${artist}` : ""}`, {
      headers: {
        Authorization: middlemanAPIKey
      }
    })

    if (res.ok) {
      let data = await res.json()

      this.hasMore = data.posts.length == 100

      let mapped = data.posts.map(async p => {
        let file = await (await fetch(`https://yiff.today/upload_middleman/file/${p.md5}`, {
          headers: {
            Authorization: middlemanAPIKey
          }
        })).blob()

        let fileType = p.name.endsWith("mp4") || p.name.endsWith("webm") ? "video" : "image"

        let url = URL.createObjectURL(file)

        let dimensions = await getFileDimesnions(url, fileType)

        let slide = new Slide(-1, "", url, "", "", dimensions[0], dimensions[1], -1, -1, fileType.toUpperCase(), p.md5, "", [], false)

        slide.wasUploaded = true
        slide.isURLUpload = false
        slide.fileForForm = file
        slide.isMiddleman = true
        slide.source = p.source
        slide.potentialAlternateSources = p.potentialAlternateSources
        slide.isMp4 = p.name.endsWith("mp4")

        return slide
      })

      this.requesting = false
      return await Promise.all(mapped)
    } else {
      this.requesting = false
      slideshowController.displayWarningMessage("Error occured, check console.")
      console.error(await res.text())
    }
  }

  async markAsUploaded(md5) {
    let res = await fetch(`https://yiff.today/upload_middleman/mark_uploaded/${md5}`, {
      method: "POST",
      headers: {
        Authorization: middlemanAPIKey
      }
    })

    if (!res.ok) {
      console.error(await res.text())
      alert("Mark as uploaded failed.")
      return false
    }

    return true
  }

  async delete(md5) {
    let res = await fetch(`https://yiff.today/upload_middleman/file/${md5}`, {
      method: "DELETE",
      headers: {
        Authorization: middlemanAPIKey
      }
    })

    if (!res.ok) {
      console.error(await res.text())
      alert("Delete failed.")
      return false
    }

    return true
  }
}