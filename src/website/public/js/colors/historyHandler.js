let history = null

document.addEventListener("DOMContentLoaded", () => {
  let h = localStorage.getItem("history")
  if (h) h = JSON.parse(h)
  else h = []
  // Hacky way around some HTML limitations
  let historyElement = document.getElementById("search-history")
  for (let i = 0; i < h.length; i++) {

    let searchHistoryItem = h[i]

    let optionElement = document.createElement("option")
    optionElement.value = searchHistoryItem
    optionElement.setAttribute("data-index", i.toString())

    historyElement.appendChild(optionElement)
  }

  history = {
    storeHistory: getValue("store-history", true),
    history: h,
  }

  let events = {}

  for (let [key, value] of Object.entries(history)) {
    if (key == "history") continue
    let element = uiElements[key]
    events[`${key}Changed`] = new Event(`${key}Changed`)
    if (element.tagName == "INPUT" && element.type == "checkbox") {
      element.checked = value
      element.addEventListener("change", () => {
        history[key] = element.checked
        setValue(element.id, element.checked)
        document.dispatchEvent(events[`${key}Changed`])
      })
    } else {
      if (value !== null) element.value = value
      element.addEventListener("change", () => {
        history[key] = element.value
        setValue(element.id, element.value)
        document.dispatchEvent(events[`${key}Changed`])
      })
    }
  }

  history.addToHistory = (text) => {
    let index = history.history.indexOf(text)
    if (index == -1) history.history.unshift(text)
    else {
      history.history.splice(index, 1)
      history.history.unshift(text)
    }

    while (history.history.length > 100) history.history.pop()

    localStorage.setItem("history", JSON.stringify(history.history))

    while (historyElement.hasChildNodes()) historyElement.removeChild(historyElement.firstChild)

    for (let i = 0; i < history.history.length; i++) {

      let searchHistoryItem = history.history[i]
  
      let optionElement = document.createElement("option")
      optionElement.value = searchHistoryItem
      optionElement.setAttribute("data-index", i.toString())
  
      historyElement.appendChild(optionElement)
    }
  }

  history.clearHistory = () => {
    history.history = []
    localStorage.setItem("history", JSON.stringify(history.history))

    while (historyElement.hasChildNodes()) historyElement.removeChild(historyElement.firstChild)
  }
})