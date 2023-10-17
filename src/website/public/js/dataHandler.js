function setValue(id, value) {
  let element = document.getElementById(id)
  if (element.tagName == "INPUT" && element.type == "checkbox") element.checked = value
  else element.value = value
  localStorage.setItem(id, value)
}

function getValue(id, def) {
  let item = localStorage.getItem(id)
  if (item !== null) {
    if (item == "null") return null
    if (item == "false" || item == "true") return item == "true"
    if (item != "" && !isNaN(item)) return Number(item)
    return item
  }

  setValue(id, def)
  return def
}