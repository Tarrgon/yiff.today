let e621Requester = new E621Requester()

let seed = Date.now()

function getBufferFromUrl(url) {
  return new Promise(async (resolve) => {
    const response = await fetch("https://corsproxy.io/?" + encodeURIComponent(url))

    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.readAsDataURL(await response.blob())
  })
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
  return mediaType == MEDIA_TYPE_IMAGE
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
  pageNumber: 1,
  currentSlideNumber: 0,
  searchText: "",
  maxThumbnails: getMaxThumbnailsBasedOnScreenSize(),
  slides: [],
  preloadingSlides: [],
  loadingNewSlides: false,

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
      let slides = await e621Requester.getSlides(slideshowController.searchText + ` order:random randseed:${seed}`, ++slideshowController.pageNumber)

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

  async displayImage(currentSlide) {
    let currentImage = uiElements.currentImage

    currentImage.style.display = "inline"

    slideshowController.updateSlideSize()

    let image = document.createElement("img")

    image.addEventListener("load", () => {
      canvasController.setImage(image, image.width, image.height)
      slideshowController.hideLoadingAnimation()
    })

    image.src = await getBufferFromUrl(currentSlide.fileUrl)
  },

  displaySlide() {
    let currentSlide = slideshowController.slides[slideshowController.currentSlideNumber]

    slideshowController.showLoadingAnimation()

    if (currentSlide.isImageOrGif()) {
      slideshowController.displayImage(currentSlide)
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

      let { explicit, questionable, safe } = { "explicit": filtering.includeExplicit, "questionable": filtering.includeQuestionable, "safe": filtering.includeSafe }

      message = `No ${explicit && questionable && safe ? "explicit," : explicit && (questionable || safe) ? "explicit or" : explicit ? "explicit" : ""} ${questionable && safe ? "questionable or" : questionable ? "questionable" : ""} ${safe ? "safe" : ""} images were found.`

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
    slideshowController.hideNavigation()
    slideshowController.clearThumbnails()
  },

  clearImage() {
    let currentImage = uiElements.currentImage

    currentImage.src = ""
    currentImage.removeAttribute("alt")
    currentImage.style.display = "none"
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

    currentImage.style.width = null
    currentImage.style.height = null
    currentImage.style.maxWidth = null
    currentImage.style.maxHeight = null

    let maxHeight = (window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight) - 180
    let maxWidth = ((window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth) / 1.3333333) - 50 // 1.33333 since the column is-9 and full is 12/12, so 12/9

    if (currentSlide.isImageOrGif()) {
      currentImage.style.maxHeight = maxHeight + "px"
      currentImage.style.maxWidth = maxWidth + "px"
      uiElements.colorButtonContainer.style.maxHeight = maxHeight + "px"
      uiElements.colorButtonContainer.style.transform = `translate(-${(uiElements.currentImage.parentElement.clientWidth - uiElements.currentImage.clientWidth) / 2 - 20}px, 0px)`
    } else {
      console.log("Couldn't update slide max height because slide isn't image or video.")
    }
  },

  windowResized() {
    slideshowController.tryToUpdateSlideSize()
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

  previousSlide() {
    slideshowController.setCurrentSlideNumber(slideshowController.currentSlideNumber - 1)
  },

  nextSlide() {
    slideshowController.setCurrentSlideNumber(slideshowController.currentSlideNumber + 1)
  },

  back10Slides() {
    slideshowController.setCurrentSlideNumber(Math.max(0, slideshowController.currentSlideNumber - 10))
  },

  forward10Slides() {
    slideshowController.setCurrentSlideNumber(Math.min(slideshowController.slides.length - 1, slideshowController.currentSlideNumber + 10))
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

  async executeSearch() {
    let searchText = uiElements.searchText.value
    slideshowController.searchText = searchText
    let slides = await e621Requester.getSlides(slideshowController.searchText + ` order:random randseed:${seed}`, uiElements.startPage.value || 1)

    slideshowController.slides = slides.filter(slideFilter)
    slideshowController.setCurrentSlideNumber(0)

    if (history.storeHistory) {
      history.addToHistory(searchText)
    }
  }
}

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
  slideshowController.executeSearch()
})

uiElements.searchText.addEventListener("keyup", async (e) => {
  if (e.key == ENTER_KEY_ID) {
    slideshowController.executeSearch()
  }
})

uiElements.searchText.addEventListener('input', (e) => {
  if (e.inputType) return
  for (let option of uiElements.searchHistory.options) {
    if (option.value == e.target.value) {
      let index = parseInt(option.getAttribute("data-index"))
      uiElements.searchText.value = history.history[index]
      return
    }
  }
})

uiElements.clearHistory.addEventListener("click", () => {
  history.clearHistory()
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
    else if (key == L_KEY_ID || key == NUMPAD_PERIOD_KEY_ID)
      slideshowController.downloadCurrentSlide()
    else if (key == E_KEY_ID)
      slideshowController.openCurrentSlide()
  }
})