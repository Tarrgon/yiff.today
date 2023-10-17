// let login = null

// document.addEventListener("DOMContentLoaded", () => {
//   login = {
//     e621Username: getValue("e621-username", ""),
//     e621ApiKey: getValue("e621-api-key", "")
//   }

//   for (let [key, value] of Object.entries(login)) {
//     let element = uiElements[key]
//     if (element.tagName == "INPUT" && element.type == "checkbox") {
//       element.checked = value
//       element.addEventListener("change", () => {
//         login[key] = element.checked
//         setValue(element.id, element.checked)
//       })
//     } else {
//       if (value !== null) element.value = value
//       element.addEventListener("change", () => {
//         login[key] = element.value
//         setValue(element.id, element.value)
//       })
//     }
//   }
// })