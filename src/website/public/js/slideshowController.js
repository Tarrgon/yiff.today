let e621Requester = new E621Requester()

async function getBufferFromUrl(url) {
  const response = await fetch("https://corsproxy.io/?" + encodeURIComponent(url))
  return Buffer.from(await response.arrayBuffer(), "base64")
}

function _min(d0, d1, d2, bx, ay) {
  return d0 < d1 || d2 < d1
    ? d0 > d2
      ? d2 + 1
      : d0 + 1
    : bx === ay
      ? d1
      : d1 + 1;
}

function levenshtein(a, b) {
  if (a === b) {
    return 0;
  }

  if (a.length > b.length) {
    var tmp = a;
    a = b;
    b = tmp;
  }

  var la = a.length;
  var lb = b.length;

  while (la > 0 && (a.charCodeAt(la - 1) === b.charCodeAt(lb - 1))) {
    la--;
    lb--;
  }

  var offset = 0;

  while (offset < la && (a.charCodeAt(offset) === b.charCodeAt(offset))) {
    offset++;
  }

  la -= offset;
  lb -= offset;

  if (la === 0 || lb < 3) {
    return lb;
  }

  var x = 0;
  var y;
  var d0;
  var d1;
  var d2;
  var d3;
  var dd;
  var dy;
  var ay;
  var bx0;
  var bx1;
  var bx2;
  var bx3;

  var vector = [];

  for (y = 0; y < la; y++) {
    vector.push(y + 1);
    vector.push(a.charCodeAt(offset + y));
  }

  var len = vector.length - 1;

  for (; x < lb - 3;) {
    bx0 = b.charCodeAt(offset + (d0 = x));
    bx1 = b.charCodeAt(offset + (d1 = x + 1));
    bx2 = b.charCodeAt(offset + (d2 = x + 2));
    bx3 = b.charCodeAt(offset + (d3 = x + 3));
    dd = (x += 4);
    for (y = 0; y < len; y += 2) {
      dy = vector[y];
      ay = vector[y + 1];
      d0 = _min(dy, d0, d1, bx0, ay);
      d1 = _min(d0, d1, d2, bx1, ay);
      d2 = _min(d1, d2, d3, bx2, ay);
      dd = _min(d2, d3, dd, bx3, ay);
      vector[y] = dd;
      d3 = d2;
      d2 = d1;
      d1 = d0;
      d0 = dy;
    }
  }

  for (; x < lb;) {
    bx0 = b.charCodeAt(offset + (d0 = x));
    dd = ++x;
    for (y = 0; y < len; y += 2) {
      dy = vector[y];
      vector[y] = dd = this._min(dy, d0, dd, bx0, vector[y + 1]);
      d0 = dy;
    }
  }

  return dd;
}

function tagsPass(tags, singleTag, negate = false, fuzzy = false) {
  if (!tags || !singleTag) return false

  let result = false
  for (let tag of tags) {
    if (fuzzy) {
      if (levenshtein(singleTag, tag) <= 2) {
        result = true
        break
      }
    } else {
      if (singleTag.includes("*")) {
        let regex = new RegExp(singleTag.replace("*", ".*"))
        if (tag.match(regex)) {
          result = true
          break
        }
      } else if (tag == singleTag) {
        result = true
        break
      }
    }
  }

  return negate ? !result : result
}

function passesGroup(item, group) {
  let passesAnd = true
  for (let tag of group.and) {
    let fuzzy = tag.endsWith("~")
    if (!tagsPass(item.tags.split(" "), fuzzy ? tag.substring(0, tag.length - 1) : tag, false, fuzzy)) {
      passesAnd = false
      break
    }
  }

  let passesNot = true
  for (let tag of group.not) {
    let fuzzy = tag.endsWith("~")
    if (!tagsPass(item.tags.split(" "), fuzzy ? tag.substring(0, tag.length - 1) : tag, true, fuzzy)) {
      passesNot = false
      break
    }
  }

  let passesOr = false
  for (let tag of group.or) {
    let fuzzy = tag.endsWith("~")
    if (tagsPass(item.tags.split(" "), fuzzy ? tag.substring(0, tag.length - 1) : tag, false, fuzzy)) {
      passesOr = true
      break
    }
  }

  return (group.or.length == 0 || passesOr) && passesAnd && passesNot
}

function isMediaTypeSupported(mediaType) {
  return (mediaType == MEDIA_TYPE_IMAGE && filtering.includeImages) ||
    (mediaType == MEDIA_TYPE_GIF && filtering.includeGifs) ||
    (mediaType == MEDIA_TYPE_VIDEO && filtering.includeWebms)
}

function isRatingAllowed(rating) {
  return (rating == "e" && filtering.includeExplicit) ||
    (rating == "q" && filtering.includeQuestionable) ||
    (rating == "s" && filtering.includeSafe)
}

function areSomeTagsAreBlacklisted(tags) {
  let postTags = tags.split(" ")
  let groups = [{ normal: [], or: [] }]
  let tokenized = filtering.blacklist.trim().replace("\n", " ").split("")

  if (postTags.length == 0 || tokenized.length == 0) return false

  let getNextToken = function (index) {
    if (index >= tokenized.length) return null
    let token = ""
    for (let i = index + 1; i < tokenized.length; i++) {
      let t = tokenized[i]
      if (t == " ") {
        return token
      } else {
        token += t
      }
    }
  }

  let skip = [")", "~"]
  let inGroup = false
  let nextOr = false

  let token = ""
  for (let i = 0; i < tokenized.length; i++) {
    let t = tokenized[i]
    if (t == " ") {
      if (token == "(") {
        inGroup = true
        groups.push({ normal: [], or: [] })
      } else if (token == ")") {
        inGroup = false
      }
      else if (!skip.includes(token)) {
        if (nextOr) {
          groups[inGroup ? groups.length - 1 : 0].or.push(token)
          if (getNextToken(i) != "~") {
            nextOr = false
          }
        } else if (getNextToken(i) == "~") {
          nextOr = true
          groups[inGroup ? groups.length - 1 : 0].or.push(token)
        } else {
          groups[inGroup ? groups.length - 1 : 0].normal.push(token)
        }
      }
      token = ""
    }
    else {
      token += t
    }
  }

  if (token.length > 0 && !skip.includes(token)) {
    groups[inGroup ? groups.length - 1 : 0].normal.push(token)
  }

  for (let tag of groups[0].normal) {
    if (!tag.startsWith("-")) {
      if (postTags.includes(tag)) {
        // console.log(`Fails blacklist, has tag: ${tag}`)
        return true
      }
    } else {
      if (!postTags.includes(tag.slice(1))) {
        // console.log(`Fails blacklist, doesn't have tag: ${tag}`)
        return true
      }
    }
  }

  for (let i = 1; i < groups.length; i++) {
    if (groups[i].normal.length > 0) {
      let hasAll = true

      for (let tag of groups[i].normal) {
        if (!tag.startsWith("-")) {
          if (!postTags.includes(tag)) {
            hasAll = false
            break
          }
        } else {
          if (postTags.includes(tag.slice(1))) {
            hasAll = false
            break
          }
        }
      }

      if (hasAll) {
        // console.log(`Fails blacklist, hasAll ${groups[i].normal}`)
        return true
      }
    }

    if (groups[i].or.length > 0) {
      let hasAny = false

      for (let tag of groups[i].or) {
        if (!tag.startsWith("-")) {
          if (!postTags.includes(tag)) {
            hasAny = true
            break
          }
        } else {
          if (postTags.includes(tag.slice(1))) {
            hasAny = true
            break
          }
        }
      }

      if (!hasAny) {
        // console.log(`Fails blacklist, hasAny ${groups[i].or}`)
        return true
      }
    }
  }

  // console.log("Passed blacklist")

  return false
}

function slideFilter(slide) {
  if (!slide.tags || slide.tags == "" || typeof slide.tags != "string") return false

  if (!isMediaTypeSupported(slide.mediaType)) return false

  if (!isRatingAllowed(slide.rating)) return false

  if (!filtering.includeSeen && history.alreadySeen(slide.id)) return false

  if (areSomeTagsAreBlacklisted(slide.tags)) return false

  let filterText = filtering.localTags.trim().replace("\n", " ")
  let groups = [
    {
      or: [],
      and: [],
      not: []
    }
  ]

  let tokenized = filterText.split("")

  if (tokenized.length == 0) return true

  let getNextToken = function (index) {
    if (index >= tokenized.length) return null;
    let token = ""
    for (let i = index + 1; i < tokenized.length; i++) {
      let t = tokenized[i]
      if (t == " ") {
        return token
      } else {
        token += t
      }
    }
  }

  let skip = ["~", ")"]
  let inGroup = false
  let nextOr = false
  let token = ""
  for (let i = 0; i < tokenized.length; i++) {
    let t = tokenized[i]
    if (t == " ") {
      if (token == "(") {
        inGroup = true
        groups.push({
          or: [],
          and: [],
          not: []
        })
      } else if (token == ")") {
        inGroup = false
      } else if (!skip.includes(token)) {
        if (nextOr) {
          groups[inGroup ? groups.length - 1 : 0].or.push(token)
          if (getNextToken(i) != "~") {
            nextOr = false
          }
        } else if (getNextToken(i) == "~") {
          nextOr = true
          groups[inGroup ? groups.length - 1 : 0].or.push(token)
        } else if (token.startsWith("-")) {
          groups[inGroup ? groups.length - 1 : 0].not.push(token.substring(1))
        } else {
          groups[inGroup ? groups.length - 1 : 0].and.push(token)
        }
      }
      token = ""
    } else {
      token += t
    }
  }

  if (token.length > 0 && !skip.includes(token)) {
    if (nextOr) {
      groups[inGroup ? groups.length - 1 : 0].or.push(token.substring(1))
    } else if (token.startsWith("-")) {
      groups[inGroup ? groups.length - 1 : 0].not.push(token.substring(1))
    }
    else {
      groups[inGroup ? groups.length - 1 : 0].and.push(token)
    }
  }

  for (let group of groups) {
    if (!passesGroup(slide, group)) {
      // console.log("Fails group:")
      // console.log(group)
      return false
    }
  }

  return true
}

let slideshowController = {
  currentSlideNumber: 0,
  searchText: "",
  maxThumbnails: getMaxThumbnailsBasedOnScreenSize(),
  slides: [],
  preloadingSlides: [],
  loadingNewSlides: false,
  isPlaying: false,
  timer: null,
  videoVolume: Number(localStorage.getItem("video-volume") || 0),
  videoMuted: localStorage.getItem("video-muted") == "true",

  isCurrentSlidePreloaded() {
    return slideshowController.slides.length > 0 && slideshowController.slides[slideshowController.currentSlideNumber].isPreloaded
  },

  getCurrentSlide() {
    return slideshowController.slides[slideshowController.currentSlideNumber]
  },

  showThumbnails() {
    slideshowController.clearThumbnails()

    if (slideshowController.slides.length > 1) {
      let nextSlides = slideshowController.slides.slice(slideshowController.currentSlideNumber + 1, slideshowController.currentSlideNumber + slideshowController.maxThumbnails + 1)
      for (let i = 0; i < nextSlides.length; i++) {
        let slide = nextSlides[i];

        let showGreyedOut = !slide.isPreloaded
        slideshowController.displayThumbnail(slide.previewFileUrl, slide.id, showGreyedOut)

        slide.clearCallback()
        slide.addCallback(() => {
          slideshowController.removeThumbnailGreyness(slide.id)
        })
      }
    }
  },

  clearThumbnails() {
    while (uiElements.thumbnailList.hasChildNodes()) {
      uiElements.thumbnailList.removeChild(uiElements.thumbnailList.firstChild)
    }
  },

  displayThumbnail(thumbnailImageUrl, id, showGreyedOut) {
    let thumbnailList = uiElements.thumbnailList

    let newThumbnail = document.createElement("div")
    newThumbnail.classList.add("thumbnail")
    newThumbnail.setAttribute("title", id)

    newThumbnail.onclick = function () {
      slideshowController.moveToSlide(id)
    }

    let newThumbnailImage = document.createElement("img")
    newThumbnailImage.id = "thumbnail-image-" + id
    newThumbnailImage.classList.add("thumbnail-image")
    newThumbnailImage.src = thumbnailImageUrl

    if (showGreyedOut) {
      newThumbnailImage.classList.add("thumbnail-image-greyed-out")
    }

    newThumbnail.appendChild(newThumbnailImage)
    thumbnailList.appendChild(newThumbnail)
  },

  removeThumbnailGreyness(id) {
    let thumbnail = document.getElementById("thumbnail-image-" + id);

    if (thumbnail != null) {
      thumbnail.classList.remove("thumbnail-image-greyed-out")
    }
  },

  moveToSlide(id) {
    let index = slideshowController.slides.findIndex(slide => slide.id == id)
    if (index != -1) {
      slideshowController.setCurrentSlideNumber(index)

      return true
    }

    return false
  },

  async loadNewSlidesIfNeeded() {
    if (!slideshowController.loadingNewSlides && slideshowController.currentSlideNumber >= slideshowController.slides.length - 11 && e621Requester.hasMore && !e621Requester.requesting) {
      loadingNewSlides = true
      let slides = await e621Requester.getSlides(slideshowController.searchText, null)

      slideshowController.slides = slideshowController.slides.concat(slides.filter(slideFilter))
      loadingNewSlides = false

      slideshowController.updateSlidesAndNavigation()

      await slideshowController.loadNewSlidesIfNeeded()
    } else {
      WAIT_DECAY = 500
    }
  },

  setCurrentSlideNumber(index) {
    if (index >= slideshowController.slides.length || index < 0) return
    slideshowController.clearCallbacksForPreloadingSlides()
    slideshowController.currentSlideNumber = index
    slideshowController.preloadCurrentSlideIfNeeded()
    slideshowController.updateSlidesAndNavigation()
    new Promise(() => {
      slideshowController.preloadNextSlides()
      slideshowController.loadNewSlidesIfNeeded()
    })

    if (history.storeSeen) history.addToSeen(slideshowController.slides[index].id)
  },

  clearCallbacksForPreloadingSlides() {
    for (let slide of slideshowController.preloadingSlides) {
      slide.clearCallback()
    }
  },

  preloadCurrentSlideIfNeeded() {
    let slide = slideshowController.slides[slideshowController.currentSlideNumber]
    if (slide) {
      slide.preload()
    }
  },

  preloadNextSlides() {
    for (let i = slideshowController.currentSlideNumber + 1; i < slideshowController.currentSlideNumber + 11; i++) {
      if (i < slideshowController.slides.length) {
        let slide = slideshowController.slides[i]
        if (!slide.isPreloaded) {
          slide.preload()
          slide.addCallback(() => {
            slideshowController.removeThumbnailGreyness(slide.id)
          })
        }
      }
    }
  },

  showLoadingAnimation() {
    uiElements.loadingAnimation.style.display = "inline"
  },

  hideLoadingAnimation() {
    uiElements.loadingAnimation.style.display = "none"
  },

  updatePlayPauseButtons() {
    if (slideshowController.isPlaying) {
      uiElements.playButton.style.display = "none"
      uiElements.pauseButton.style.display = "inline"
    } else {
      uiElements.playButton.style.display = "inline"
      uiElements.pauseButton.style.display = "none"
    }
  },

  updateFirstPreviousButtons() {
    if (slideshowController.currentSlideNumber > 0) {
      uiElements.firstButton.disabled = false
      uiElements.previousButton.disabled = false
    } else {
      uiElements.firstButton.disabled = true
      uiElements.previousButton.disabled = true
    }
  },

  updateNextLastButtons() {
    if (slideshowController.currentSlideNumber < slideshowController.slides.length) {
      uiElements.firstButton.disabled = false
      uiElements.previousButton.disabled = false
    } else {
      uiElements.firstButton.disabled = true
      uiElements.previousButton.disabled = true
    }
  },

  updateCurrentNumberDisplay() {
    uiElements.currentSlideNumber.innerText = slideshowController.currentSlideNumber + 1
  },

  updateTotalNumberDisplay() {
    let totalNumberText = slideshowController.slides.length

    if (e621Requester.hasMore) {
      totalNumberText += "+";
    }

    uiElements.totalSlideNumber.innerText = totalNumberText;
  },

  updateNavigationButtonsAndDisplay() {
    slideshowController.updateCurrentNumberDisplay()
    slideshowController.updateTotalNumberDisplay()

    slideshowController.updateFirstPreviousButtons()
    slideshowController.updatePlayPauseButtons()
    slideshowController.updateNextLastButtons()
  },

  showNavigation() {
    uiElements.navigation.style.display = "block"
  },

  hideNavigation() {
    uiElements.navigation.style.display = "none"
  },

  updateNavigation() {
    if (slideshowController.slides.length > 0) {
      slideshowController.updateNavigationButtonsAndDisplay()
      slideshowController.showNavigation()
    } else {
      slideshowController.hideNavigation()
    }
  },

  isDisplayingWarningMessage() {
    return uiElements.warningMessage.style.display == "block"
  },

  updateSlides() {
    slideshowController.clearCallbacksForPreloadingSlides()
    slideshowController.preloadCurrentSlideIfNeeded()
    slideshowController.displayCurrentSlide()
    slideshowController.showThumbnails()
  },

  displayImage(currentSlide) {
    let currentImage = uiElements.currentImage

    currentImage.src = currentSlide.fileUrl
    currentImage.setAttribute("alt", currentSlide.id)
    currentImage.style.display = "inline"

    slideshowController.clearVideo()
    slideshowController.updateSlideSize()
  },

  updateVideoVolume() {
    uiElements.currentVideo.volume = slideshowController.videoVolume
  },

  updateVideoMuted() {
    uiElements.currentVideo.muted = slideshowController.videoMuted
  },

  displayVideo(currentSlide) {
    let currentVideo = uiElements.currentVideo

    currentVideo.src = currentSlide.fileUrl
    currentVideo.style.display = "inline"

    slideshowController.clearImage()
    slideshowController.updateSlideSize()
    slideshowController.updateVideoVolume()
    slideshowController.updateVideoMuted()
  },

  displaySlide() {
    let currentSlide = slideshowController.slides[slideshowController.currentSlideNumber]

    slideshowController.showLoadingAnimation()

    if (currentSlide.isImageOrGif()) {
      slideshowController.displayImage(currentSlide)
    } else if (currentSlide.isVideo()) {
      slideshowController.displayVideo(currentSlide)
    } else {
      console.log("Trying to display slide that isn't an image or video.")
    }
  },

  displayCurrentSlide() {
    if (slideshowController.hasSlidesToDisplay()) {
      slideshowController.displaySlide()
    } else if (slideshowController.isDisplayingWarningMessage()) {
      // Current warning message more important
    } else {
      let message = '';

      let includingImagesOrGifs = (filtering.includeImages || filtering.includeGifs)
      let { explicit, questionable, safe } = { "explicit": filtering.includeExplicit, "questionable": filtering.includeQuestionable, "safe": filtering.includeSafe }

      if (includingImagesOrGifs && filtering.includeWebms)
        message = `No ${explicit && questionable && safe ? "explicit," : explicit && (questionable || safe) ? "explicit or" : explicit ? "explicit" : ""} ${questionable && safe ? "questionable or" : questionable ? "questionable" : ""} ${safe ? "safe" : ""} images or videos were found.`
      else if (includingImagesOrGifs && !filtering.includeWebms)
        message = `No ${explicit && questionable && safe ? "explicit," : explicit && (questionable || safe) ? "explicit or" : explicit ? "explicit" : ""} ${questionable && safe ? "questionable or" : questionable ? "questionable" : ""} ${safe ? "safe" : ""} images were found.`
      else if (!includingImagesOrGifs && filtering.includeWebms)
        message = `No ${explicit && questionable && safe ? "explicit," : explicit && (questionable || safe) ? "explicit or" : explicit ? "explicit" : ""} ${questionable && safe ? "questionable or" : questionable ? "questionable" : ""} ${safe ? "safe" : ""} videos were found.`

      slideshowController.displayWarningMessage(message)
    }
  },

  updateSlidesAndNavigation() {
    slideshowController.updateSlides()
    slideshowController.updateNavigation()
    slideshowController.clearWarningMessage()
    slideshowController.clearInfoMessage()
  },

  clearUI() {
    slideshowController.clearWarningMessage()
    slideshowController.clearInfoMessage()
    slideshowController.clearImage()
    slideshowController.clearVideo()
    slideshowController.hideNavigation()
    slideshowController.clearThumbnails()
  },

  clearImage() {
    let currentImage = uiElements.currentImage

    currentImage.src = ""
    currentImage.removeAttribute("alt")
    currentImage.style.display = "none"
  },

  clearVideo() {
    let currentVideo = uiElements.currentVideo

    currentVideo.src = ""
    currentVideo.style.display = "none"
  },

  hasSlidesToDisplay() {
    return slideshowController.slides.length > 0
  },

  tryToUpdateSlideSize() {
    if (slideshowController.hasSlidesToDisplay()) {
      slideshowController.updateSlideSize()
    }
  },

  updateSlideSize() {
    let currentSlide = slideshowController.slides[slideshowController.currentSlideNumber]

    let currentImage = uiElements.currentImage
    let currentVideo = uiElements.currentVideo

    let autoFitSlide = presentation.autoFitSlide

    currentImage.style.width = null
    currentImage.style.height = null
    currentImage.style.maxWidth = null
    currentImage.style.maxHeight = null

    currentVideo.style.width = null
    currentVideo.style.height = null
    currentVideo.style.maxWidth = null
    currentVideo.style.maxHeight = null

    if (autoFitSlide) {
      let viewWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth
      let viewHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight

      let newWidth = currentSlide.width
      let newHeight = currentSlide.height

      let viewRatio = viewWidth / viewHeight
      let newRatio = newWidth / newHeight

      if (newRatio > viewRatio) {
        newWidth = viewWidth
        newHeight = viewWidth / newRatio
      } else {
        newWidth = viewHeight * newRatio
        newHeight = viewHeight
      }

      if (currentSlide.isImageOrGif()) {
        currentImage.style.width = newWidth + "px"
        currentImage.style.height = (newHeight - 10) + "px"
      } else if (currentSlide.isVideo()) {
        currentVideo.style.width = newWidth + "px"
        currentVideo.style.height = (newHeight - 10) + "px"
      } else {
        console.log("Couldn't update slide size because slide isn't image or video.")
      }
    } else {
      if (presentation.maxWidth != null) {
        let maxWidth = parseInt(presentation.maxWidth)

        if (currentSlide.isImageOrGif()) {
          currentImage.style.maxWidth = maxWidth + "px"
        } else if (currentSlide.isVideo()) {
          currentVideo.style.maxWidth = maxWidth + "px"
        } else {
          console.log("Couldn't update slide max width because slide isn't image or video.")
        }
      }

      if (presentation.maxHeight != null) {
        let maxHeight = parseInt(presentation.maxHeight)

        if (currentSlide.isImageOrGif()) {
          currentImage.style.maxHeight = maxHeight + "px"
        } else if (currentSlide.isVideo()) {
          currentVideo.style.maxHeight = maxHeight + "px"
        } else {
          console.log("Couldn't update slide max height because slide isn't image or video.")
        }
      }
    }
  },

  windowResized() {
    if (presentation.autoFitSlide) {
      slideshowController.tryToUpdateSlideSize()
    }
  },

  displayWarningMessage(message) {
    uiElements.warningMessage.innerHTML = message
    uiElements.warningMessage.style.display = "block"
  },

  clearWarningMessage() {
    uiElements.warningMessage.innerHTML = ""
    uiElements.warningMessage.style.display = "none"
  },

  displayInfoMessage(message) {
    uiElements.infoMessage.innerHTML = message
    uiElements.infoMessage.style.display = "block"
  },

  clearInfoMessage() {
    uiElements.infoMessage.innerHTML = ""
    uiElements.infoMessage.style.display = "none"
  },

  getVideoVolume() {
    return uiElements.currentVideo.volume
  },

  getVideoMuted() {
    return uiElements.currentVideo.muted
  },

  previousSlide() {
    slideshowController.setCurrentSlideNumber(slideshowController.currentSlideNumber - 1)

    slideshowController.restartSlideshowIfOn()
  },

  nextSlide() {
    slideshowController.setCurrentSlideNumber(slideshowController.currentSlideNumber + 1)

    slideshowController.restartSlideshowIfOn()
  },

  back10Slides() {
    slideshowController.setCurrentSlideNumber(Math.max(0, slideshowController.currentSlideNumber - 10))

    slideshowController.restartSlideshowIfOn()
  },

  forward10Slides() {
    slideshowController.setCurrentSlideNumber(Math.min(slideshowController.slides.length - 1, slideshowController.currentSlideNumber + 10))

    slideshowController.restartSlideshowIfOn()
  },

  hasNextSlide() {
    return slideshowController.currentSlideNumber < slideshowController.slides.length - 1
  },

  runCodeWhenCurrentSlideFinishesLoading(callback) {
    let currentSlide = slideshowController.getCurrentSlide()

    currentSlide.addCallback(function () {
      if (currentSlide == slideshowController.getCurrentSlide()) {
        callback.call()
      }
    })
  },

  tryToPlayOrPause() {
    if (slideshowController.hasSlidesToDisplay()) {
      if (slideshowController.isPlaying)
        slideshowController.pauseSlideshow()
      else
        slideshowController.startSlideshow()
    }

    slideshowController.updateNavigation()
  },

  startSlideshow() {
    slideshowController.tryToStartCountdown()

    slideshowController.isPlaying = true
  },

  tryToStartCountdown() {
    if (slideshowController.getCurrentSlide().isPreloaded) {
      slideshowController.startCountdown()
    } else {
      slideshowController.runCodeWhenCurrentSlideFinishesLoading(() => {
        slideshowController.startCountdown()
      })
    }
  },

  async startCountdown() {
    let millisecondsPerSlide = presentation.secondsPerSlide * 1000

    if (presentation.slideshowPlaysFullVideo) {
      let slide = slideshowController.getCurrentSlide()
      if (slide.mediaType == MEDIA_TYPE_GIF) {
        let buffer = await getBufferFromUrl(slide.fileUrl)
        let frames = await gifFrames({ url: buffer, frames: "all", outputType: "png" })
        let duration = 0
        for (let frame of frames) {
          duration += frame.frameInfo.delay
        }

        millisecondsPerSlide = duration * 10

        if (millisecondsPerSlide < presentation.slideshowLowDurationMp4Seconds * 1000) {
          millisecondsPerSlide = duration * 10 * presentation.slideshowGifLoopCount

          while (millisecondsPerSlide < presentation.secondsPerSlide * 1000) {
            millisecondsPerSlide += duration * 10
          }
        }

      } else if (slide.mediaType == MEDIA_TYPE_VIDEO) {
        if (uiElements.currentVideo.readyState === 4) {
          millisecondsPerSlide = uiElements.currentVideo.duration * 1000
        } else {
          await new Promise(resolve => {
            uiElements.currentVideo.onloadeddata = () => {
              resolve()
            }
          })

          millisecondsPerSlide = uiElements.currentVideo.duration * 1000
        }

        if (millisecondsPerSlide < presentation.slideshowLowDurationMp4Seconds * 1000) {
          millisecondsPerSlide = uiElements.currentVideo.duration * presentation.slideshowGifLoopCount * 1000
          while (millisecondsPerSlide < presentation.secondsPerSlide * 1000) {
            millisecondsPerSlide += uiElements.currentVideo.duration * 1000
          }
        }
      }
    }

    slideshowController.timer = setTimeout(function () {
      if (slideshowController.hasNextSlide()) {
        // Continue slideshow
        slideshowController.nextSlide()
      }
      else {
        // Loop when out of images/videos
        slideshowController.setSlideNumberToFirst()
      }
    }, millisecondsPerSlide)
  },

  restartSlideshowIfOn() {
    if (slideshowController.isPlaying) {
      clearTimeout(slideshowController.timer)
      slideshowController.clearCallbacksForPreloadingSlides()

      slideshowController.tryToStartCountdown()
    }
  },

  pauseSlideshow() {
    clearTimeout(slideshowController.timer)
    slideshowController.clearCallbacksForPreloadingSlides()

    slideshowController.isPlaying = false
  },

  async downloadCurrentSlide() {
    let slide = slideshowController.getCurrentSlide()

    if (slide) {
      let image = await fetch("https://corsproxy.io/?" + encodeURIComponent(slide.fileUrl))
      let imageBlob = await image.blob()
      let imageURL = URL.createObjectURL(imageBlob)
      let a = document.createElement('a')
      a.href = imageURL
      a.download = slide.fileUrl.slice(slide.fileUrl.lastIndexOf("/") + 1)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  },

  openCurrentSlide() {
    let slide = slideshowController.getCurrentSlide()

    if (slide) {
      let a = document.createElement('a')
      a.href = slide.viewableWebsitePostUrl
      a.target = "_blank"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  },

  forwardVideo() {
    let curVideo = uiElements.currentVideo
    if (!curVideo.src.startsWith("http")) return
    curVideo.currentTime += 5
  },

  backwardVideo() {
    let curVideo = uiElements.currentVideo
    if (!curVideo.src.startsWith("http")) return
    curVideo.currentTime -= 5
  },

  playVideo() {
    let curVideo = uiElements.currentVideo
    if (!curVideo.src.startsWith("http")) return
    if (curVideo.paused) curVideo.play()
    else curVideo.pause()
  },

  addArtistsToSearch() {
    let slide = slideshowController.getCurrentSlide()

    if (slide) {
      let map = slide.rawTags[1].map(a => a.split(" ").join("_")).filter(a => a != "unknown_artist" && a != "third-party_edit" && a != "anonymous_artist" && a != "conditional_dnp" && a != "sound_warning" && !uiElements.searchText.value.includes(a)).join(" ~")
      if (map.length > 0) uiElements.searchText.value += " ~" + map
    }
  },

  async exectueSearch() {
    let searchText = uiElements.searchText.value
    slideshowController.searchText = searchText
    let slides = await e621Requester.getSlides(slideshowController.searchText, uiElements.startPage.value || 1)

    slideshowController.slides = slides.filter(slideFilter)
    slideshowController.setCurrentSlideNumber(0)

    if (history.storeHistory) {
      history.addToHistory(searchText)
    }
  }
}

uiElements.currentVideo.addEventListener("volumechange", () => {
  localStorage.setItem("video-volume", slideshowController.getVideoVolume())
  localStorage.setItem("video-muted", slideshowController.getVideoMuted())

  slideshowController.videoVolume = slideshowController.getVideoVolume()
  slideshowController.videoMuted = slideshowController.getVideoMuted()
})

uiElements.currentImage.onload = () => {
  slideshowController.hideLoadingAnimation()
}

uiElements.currentVideo.addEventListener("loadeddata", () => {
  slideshowController.hideLoadingAnimation()
}, false)

uiElements.playButton.addEventListener("click", () => {
  slideshowController.startSlideshow()
  slideshowController.updateSlidesAndNavigation()
})

uiElements.pauseButton.addEventListener("click", () => {
  slideshowController.pauseSlideshow()
  slideshowController.updateSlidesAndNavigation()
})

uiElements.nextButton.addEventListener("click", () => {
  slideshowController.nextSlide()
  slideshowController.updateSlidesAndNavigation()
})

uiElements.previousButton.addEventListener("click", () => {
  slideshowController.previousSlide()
  slideshowController.updateSlidesAndNavigation()
})

uiElements.firstButton.addEventListener("click", () => {
  slideshowController.setCurrentSlideNumber(0)
  slideshowController.updateSlidesAndNavigation()
})

uiElements.lastButton.addEventListener("click", () => {
  slideshowController.setCurrentSlideNumber(slideshowController.slides.length - 1)
  slideshowController.updateSlidesAndNavigation()
})

uiElements.searchButton.addEventListener("click", async () => {
  slideshowController.exectueSearch()
})

uiElements.searchText.addEventListener("keyup", async (e) => {
  if (e.key == ENTER_KEY_ID) {
    slideshowController.exectueSearch()
  }
})

uiElements.searchText.addEventListener('input', (e) => {
  if (e.inputType) return
  let wantedIndex = parseInt(e.target.value.match(/^(-(\d*)-)/)[2])
  for (let val of uiElements.searchHistory.options) {
    let index = parseInt(val.value.match(/^(-(\d*)-)/)[2])
    if (wantedIndex == index) {
      uiElements.searchText.value = val.value.replace(/^(-(\d*)-)/, "")
      return
    }
  }
})

uiElements.clearHistory.addEventListener("click", () => {
  history.clearHistory()
})

uiElements.clearSeen.addEventListener("click", () => {
  history.clearSeen()
})

window.addEventListener("resize", () => {
  slideshowController.windowResized()
})

document.addEventListener("keydown", (e) => {
  let key = e.code ? (e.code.includes("Numpad") ? e.code : e.key) : e.key

  if (e.ctrlKey || e.altKey || e.shiftKey || !(key == ENTER_KEY_ID ||
    key == SPACE_KEY_ID ||
    key == LEFT_ARROW_KEY_ID ||
    key == RIGHT_ARROW_KEY_ID ||
    key == UP_ARROW_KEY_ID ||
    key == DOWN_ARROW_KEY_ID ||
    key == A_KEY_ID ||
    key == D_KEY_ID ||
    key == S_KEY_ID ||
    key == W_KEY_ID ||
    key == F_KEY_ID ||
    key == L_KEY_ID ||
    key == G_KEY_ID ||
    key == E_KEY_ID ||
    key == T_KEY_ID ||
    key == ONE_KEY_ID ||
    key == TWO_KEY_ID ||
    key == THREE_KEY_ID ||
    key == NUMPAD_ENTER_KEY_ID ||
    key == NUMPAD_ZERO_KEY_ID ||
    key == NUMPAD_PERIOD_KEY_ID ||
    key == NUMPAD_ONE_KEY_ID ||
    key == NUMPAD_TWO_KEY_ID ||
    key == NUMPAD_THREE_KEY_ID)) return


  if (document.activeElement && document.activeElement.tagName != "INPUT" && document.activeElement.tagName != "TEXTAREA") {
    e.preventDefault()

    if (key == LEFT_ARROW_KEY_ID || key == A_KEY_ID)
      slideshowController.previousSlide()
    else if (key == RIGHT_ARROW_KEY_ID || key == D_KEY_ID)
      slideshowController.nextSlide()
    else if (key == UP_ARROW_KEY_ID || key == W_KEY_ID)
      slideshowController.back10Slides()
    else if (key == DOWN_ARROW_KEY_ID || key == S_KEY_ID)
      slideshowController.forward10Slides()
    else if (key == ENTER_KEY_ID || key == NUMPAD_ENTER_KEY_ID || key == SPACE_KEY_ID)
      slideshowController.tryToPlayOrPause()
    else if (key == F_KEY_ID)
      presentation.setAutoFitSlide(!presentation.autoFitSlide)
    else if (key == L_KEY_ID || key == NUMPAD_PERIOD_KEY_ID)
      slideshowController.downloadCurrentSlide()
    else if (key == G_KEY_ID || key == NUMPAD_ONE_KEY_ID)
      slideshowController.favoriteCurrentSlide()
    else if (key == E_KEY_ID)
      slideshowController.openCurrentSlide()
    else if (key == T_KEY_ID)
      slideshowController.addArtistsToSearch()
    else if (key == ONE_KEY_ID || key == NUMPAD_ONE_KEY_ID)
      slideshowController.backwardVideo()
    else if (key == TWO_KEY_ID || key == NUMPAD_TWO_KEY_ID)
      slideshowController.forwardVideo()
    else if (key == THREE_KEY_ID || key == NUMPAD_THREE_KEY_ID)
      slideshowController.playVideo()
  }
})