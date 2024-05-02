let login = null

async function checkCanApprovePosts() {
  if (!login.e621Username || !login.e621Username) return false

  let res = await fetch(`https://e621.net/users.json?search[name_matches]=${login.e621Username}&limit=1`)

  if (!res.ok) return false

  let data = await res.json()

  return data[0]?.can_approve_posts
}

async function getE621Id() {
  if (!login.e621Username || !login.e621Username) return null

  let res = await fetch(`https://e621.net/users.json?search[name_matches]=${login.e621Username}&limit=1`)

  if (!res.ok) return false

  let data = await res.json()

  return data[0]?.id
}

document.addEventListener("DOMContentLoaded", async () => {
  login = {
    e621Username: getValue("e621-username", ""),
    e621ApiKey: getValue("e621-api-key", "")
  }

  for (let [key, value] of Object.entries(login)) {
    let element = uiElements[key]
    if (element.tagName == "INPUT" && element.type == "checkbox") {
      element.checked = value
      element.addEventListener("change", () => {
        login[key] = element.checked
        setValue(element.id, element.checked)
      })
    } else {
      if (value !== null) element.value = value
      element.addEventListener("change", () => {
        login[key] = element.value
        setValue(element.id, element.value)
      })
    }
  }

  login.canApprovePosts = await checkCanApprovePosts()
  login.e621Id = await getE621Id()

  if (login.canApprovePosts && uiElements.modStatsContainer) modStats.updateStats()
})