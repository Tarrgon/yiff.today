let middlemanAPIKey = null

document.addEventListener("DOMContentLoaded", () => {
  middlemanAPIKey = getValue("middleman-api-key", "")

  let element = uiElements.middlemanAPIKey
  if (middlemanAPIKey !== null) element.value = middlemanAPIKey
  element.addEventListener("change", () => {
    middlemanAPIKey = element.value
    setValue(element.id, element.value)
  })
})