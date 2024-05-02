class Slide {

  static preloading = 0

  constructor(id, rating, fileUrl, previewFileUrl, viewableWebsitePostUrl, width, height, date, score, mediaType, md5, tags, rawTags, isPending) {
    // console.log("New Slide")
    this.id = id
    this.rating = rating
    this.fileUrl = fileUrl
    this.previewFileUrl = previewFileUrl
    this.viewableWebsitePostUrl = viewableWebsitePostUrl
    this.width = width
    this.height = height
    this.date = date
    this.score = score
    this.mediaType = mediaType
    this.md5 = md5
    this.isPreloaded = false
    this.isPreloading = false
    this.preloadingImage = null
    this.preloadingVideo = null
    this.callbackToRunAfterPreloadingFinishes = null
    this.tags = tags
    this.rawTags = rawTags
    this.isPending = isPending
  }

  clone() {
    // console.log(this.tags)
    return new Slide(
      this.id,
      this.rating,
      this.fileUrl,
      this.previewFileUrl,
      this.viewableWebsitePostUrl,
      this.width,
      this.height,
      this.date,
      this.score,
      this.mediaType,
      this.md5,
      this.tags,
      this.rawTags,
      this.isPending
    )
  }

  async hasPendingReplacements() {
    if (this._hasPendingReplacements !== undefined) return this._hasPendingReplacements
    let res = await fetch(`https://e621.net/post_replacements.json?search%5Bpost_id%5D=${this.id}`)

    if (!res.ok) {
      this._hasPendingReplacements = false
      return
    }

    let data = await res.json()

    if (data.post_replacements) {
      this._hasPendingReplacements = false
      return
    }

    this._hasPendingReplacements = data.length > 0

    return this._hasPendingReplacements
  }

  preload() {
    // console.log("preloading")
    if (Slide.preloading >= 10) return
    if (!this.isPreloaded && !this.isPreloading) {
      this.isPreloading = true
      if (this.isImageOrGif()) {
        Slide.preloading++
        slideshowController.preloadingSlides.push(this)
        this.preloadImage()
      } else if (this.isVideo()) {
        Slide.preloading++
        slideshowController.preloadingSlides.push(this)
        this.preloadVideo()
      } else {
        console.log("Couldn't determine type of media to preload.")
        console.log(this)
      }
    }
  }

  async reload() {
    let slide = await e621Requester.getSlide(this.id)

    let index = slideshowController.slides.findIndex(s => s.id == this.id)

    if (index != -1) {
      slideshowController.slides[index] = slide
    }
  }

  preloadImage() {
    this.preloadingImage = new Image()

    let slide = this

    this.preloadingImage.onload = () => {
      Slide.preloading--
      slideshowController.preloadingSlides.splice(slideshowController.preloadingSlides.indexOf(slide), 1)
      slide.isPreloaded = true
      slide.isPreloading = false

      if (slide.callbackToRunAfterPreloadingFinishes != null) {
        slide.callbackToRunAfterPreloadingFinishes.call(slide)
      }
    }

    this.preloadingImage.onerror = () => {
      Slide.preloading--
      slideshowController.preloadingSlides.splice(slideshowController.preloadingSlides.indexOf(slide), 1)
      slide.isPreloading = false
    }

    this.preloadingImage.src = this.fileUrl
  }

  preloadVideo() {
    this.preloadingVideo = document.createElement("video")

    let slide = this

    this.preloadingVideo.addEventListener("loadeddata", () => {
      Slide.preloading--
      slideshowController.preloadingSlides.splice(slideshowController.preloadingSlides.indexOf(slide), 1)
      slide.isPreloaded = true
      slide.isPreloading = false

      if (slide.callbackToRunAfterPreloadingFinishes != null) {
        slide.callbackToRunAfterPreloadingFinishes.call(slide)
      }
    }, false)

    this.preloadingVideo.addEventListener("error", () => {
      Slide.preloading--
      slideshowController.preloadingSlides.splice(slideshowController.preloadingSlides.indexOf(this), 1)
      slide.isPreloading = false
    }, true)

    this.preloadingVideo.src = this.fileUrl
    this.preloadingVideo.load()
  }

  addCallback(callback) {
    this.callbackToRunAfterPreloadingFinishes = callback
  }

  clearCallback() {
    this.callbackToRunAfterPreloadingFinishes = null
  }

  isImageOrGif() {
    return this.mediaType == MEDIA_TYPE_IMAGE || this.mediaType == MEDIA_TYPE_GIF
  }

  isVideo() {
    return this.mediaType == MEDIA_TYPE_VIDEO
  }

  isGif() {
    return this.mediaType == MEDIA_TYPE_GIF
  }

  isGifOrVideo() {
    return this.mediaType == MEDIA_TYPE_GIF || this.mediaType == MEDIA_TYPE_VIDEO
  }

  getVideoDuration() {
    if (this.isVideo() && this.preloadingVideo.readyState > 0) {
      return this.preloadingVideo.duration
    }
    else if (this.isGif()) {

    } else {
      return -1
    }
  }

  toString() {
    return "Slide " + this.id + " " + this.rating + " " + this.fileUrl + " " + this.fileUrl + " " + this.previewFileUrl + " " + this.width + " " + this.height
  }
}