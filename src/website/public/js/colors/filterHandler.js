let filtering = null

document.addEventListener("DOMContentLoaded", () => {
  filtering = {
    includeExplicit: getValue("include-explicit", false),
    includeQuestionable: getValue("include-questionable", false),
    includeSafe: getValue("include-safe", true),
    localTags: getValue("local-tags", ""),
    blacklist: getValue("blacklist", "")
  }

  for (let [key, value] of Object.entries(filtering)) {
    let element = uiElements[key]
    if (element.tagName == "INPUT" && element.type == "checkbox") {
      element.checked = value
      element.addEventListener("change", () => {
        filtering[key] = element.checked
        setValue(element.id, element.checked)
      })
    } else {
      if (value !== null) element.value = value
      element.addEventListener("change", () => {
        filtering[key] = element.value
        setValue(element.id, element.value)
      })
    }
  }
})