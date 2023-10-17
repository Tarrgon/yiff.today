let presentation = null

document.addEventListener("DOMContentLoaded", () => {
  presentation = {
    maxWidth: getValue("max-width", null),
    maxHeight: getValue("max-height", null),
    autoFitSlide: getValue("auto-fit-slide", true)
  }

  let events = {}

  for (let [key, value] of Object.entries(presentation)) {
    let element = uiElements[key]
    events[`${key}Changed`] = new Event(`${key}Changed`)
    if (element.tagName == "INPUT" && element.type == "checkbox") {
      element.checked = value
      element.addEventListener("change", () => {
        presentation[key] = element.checked
        setValue(element.id, element.checked)
        document.dispatchEvent(events[`${key}Changed`])
      })
    } else {
      if (value !== null) element.value = value
      element.addEventListener("change", () => {
        presentation[key] = element.value
        setValue(element.id, element.value)
        document.dispatchEvent(events[`${key}Changed`])
      })
    }
  }

  document.addEventListener("autoFitSlideChanged", () => {
    slideshowController.tryToUpdateSlideSize()
  })

  document.addEventListener("maxWidthChanged", () => {
    slideshowController.tryToUpdateSlideSize()
  })

  document.addEventListener("maxHeightChanged", () => {
    slideshowController.tryToUpdateSlideSize()
  })

  presentation.setAutoFitSlide = (autoFitSlide) => {
    presentation.autoFitSlide = autoFitSlide
    uiElements.autoFitSlide.checked = autoFitSlide
    setValue("auto-fit-slide", autoFitSlide)
    document.dispatchEvent(events["autoFitSlideChanged"])
  }
})