const BACKGROUND_COLORS = ["#b4c7d9", "#f2ac08", "god is surely dead since this is empty", "#d0d", "#0a0", "#ed5d1f", "#ff3d3d", "#fff", "#282"]
const CATEGORIES = ["general", "artist", "dead god", "copyright", "character", "species", "invalid", "meta", "lore"]

function toTitle(str) {
  return str.replaceAll("_", " ").replace(
    /\w\S*/g,
    (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    }
  )
}

function removeFromText(text, toRemove) {
  return text.split(" ").filter(t => t != toRemove).join(" ")
}

function addToText(text, toAdd) {
  if (text.split(" ").filter(t => t == toAdd).length == 0) {
    return text + " " + toAdd
  }

  return text
}

function recursiveFindChild(implications, name) {
  if (implications.thisTag.name == name) return implications

  for (let implication of implications.children) {
    let s = recursiveFindChild(implication, name)
    if (s) return s
  }

  return null
}

function findChildInStructure(structure, name) {
  let recursion = (struct) => {
    for (let child of struct.children) {
      if (child.thisTag.name == name) {
        return child
      } else {
        let c = recursion(child)
        if (c) return c
      }
    }
  }

  for (let s of Object.values(structure)) {
    if (s.thisTag.name == name) {
      return s
    } else {
      let child = recursion(s)
      if (child) return child
    }
  }
}

function resolveTagStructure(unresolvedImplications, tags, structure = {}) {
  if (Object.entries(unresolvedImplications).length == 0) return structure

  for (let [tagName, implications] of Object.entries(unresolvedImplications).toSorted((a, b) => a[1].parents.length - b[1].parents.length)) {
    if (implications.parents.length == 0) {
      implications.thisTag.active = tags.includes(implications.thisTag.name)
      implications.thisTag.fetchedChildren = false
      let imps = {
        parents: [],
        thisTag: implications.thisTag
      }

      imps.children = implications.children.map(imp => {
        imp.active = tags.includes(imp.name)
        return {
          parents: [imps],
          children: [],
          thisTag: imp
        }
      })

      structure[tagName] = imps

      delete unresolvedImplications[tagName]
    } else {
      for (let parent of implications.parents) {
        let thisParent = structure[parent.name]
        if (!structure[parent.name]) {
          for (let [topLevelTagName, topLevelImplications] of Object.entries(structure)) {
            thisParent = recursiveFindChild(topLevelImplications, parent.name)
            if (thisParent) {
              break
            }
          }
        }

        if (thisParent) {
          let index = thisParent.children.findIndex(c => c.thisTag.id == implications.thisTag.id)

          if (index == -1) {
            implications.thisTag.active = tags.includes(implications.thisTag.name)
            thisParent.children.push({
              parents: [thisParent],
              children: [],
              thisTag: implications.thisTag
            })
          }

          delete unresolvedImplications[tagName]
        }
      }
    }
  }

  return resolveTagStructure(unresolvedImplications, tags, structure)
}

async function getImplications(tags, allImplications, include = "children,parents") {
  let implications = await tagImplicationHandler.getTagImplications(tags, include)

  let unresolvedParents = []

  for (let [tagName, data] of Object.entries(implications)) {
    if (data.parents > 0) {
      let parents = []

      for (let parent of data.parents) {
        if (!allImplications[parent.name] && !implications[parent.name]) {
          parents.push(parent.name)
        }
      }

      if (parents.length > 0)
        unresolvedParents.push(...parents)
    }

    allImplications[tagName] = data
  }

  if (unresolvedParents.length > 0) {
    await getImplications(unresolvedParents.join(" "), allImplications, include)
  }
}

function reparent(parent, button) {
  let li = document.createElement("li")
  parent.appendChild(li)

  let newDetails = document.createElement("details")
  li.appendChild(newDetails)

  newDetails.appendChild(button)

  return li
}

function createImplicationRequester(tagName, depth, parentGroup) {
  let li = document.createElement("li")

  let details = document.createElement("details")
  li.appendChild(details)

  let showButton = document.createElement("summary")
  showButton.classList.add("show-implications-button")
  showButton.innerText = "Show Implications"
  details.appendChild(showButton)

  let hideButton = document.createElement("summary")
  hideButton.classList.add("hide-implications-button")
  hideButton.innerText = "Hide Implications"

  // if (!tagTreeHandler.buttons[tagName]) tagTreeHandler.buttons[tagName] = []

  // tagTreeHandler.buttons[tagName].push({
  //   showButton,
  //   hideButton
  // })

  let requesting = false

  let parent = null

  hideButton.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopImmediatePropagation()

    tagTreeHandler.preventScroll = false

    for (let child of parent.children) {
      child.classList.add("hidden")
    }

    hideButton?.parentElement?.parentElement?.remove()

    let li = reparent(parent, showButton)

    if (parent.children.length > 15) showButton.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" })

    if (parent.querySelectorAll("ul > li > details[open]").length != 0) {
      li.classList.add("has-active-children")
    }
  })

  showButton.addEventListener("click", async (e) => {
    e.preventDefault()
    e.stopImmediatePropagation()
    if (!parent) parent = li.parentElement
    if (parentGroup.thisTag.fetchedChildren) {
      for (let child of parent.children) {
        child.classList.remove("hidden")
      }

      showButton?.parentElement?.parentElement?.remove()

      reparent(parent, hideButton)

      if (!tagTreeHandler.preventScroll) parent.parentElement.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" })

      return
    }

    if (requesting) return
    requesting = true
    parentGroup.thisTag.fetchedChildren = true

    let allImplications = {}
    await getImplications(tagName, allImplications, "children")

    let structure = resolveTagStructure(allImplications, tagTreeHandler.tags)

    let realStructure = findChildInStructure(tagTreeHandler.currentStructure, tagName)

    realStructure.children = realStructure.children.concat(structure[tagName].children).filter((c, i, arr) => arr.findIndex(a => a.thisTag.name == c.thisTag.name) == i)

    realStructure.children.sort((a, b) => {
      let startingDigitsA = a.thisTag.name.match(/^\d+/)
      let startingDigitsB = b.thisTag.name.match(/^\d+/)
      if (startingDigitsA && startingDigitsB) {
        return parseInt(startingDigitsA[0]) - parseInt(startingDigitsB[0])
      }
      return a.thisTag.name.localeCompare(b.thisTag.name)
    })

    while (parent.firstChild) {
      parent.removeChild(parent.firstChild)
    }

    for (let child of realStructure.children) {
      try {
        let p = child.parents.find(p => p.thisTag.name == tagName)
        p.thisTag.fetchedChildren = true
        parent.appendChild(createTagTree(child, depth))
      } catch (e) {
        console.error(e)
        console.error(child)
        console.error(tagName)
      }
      
    }

    showButton.remove()
    if (realStructure.children.length > 0) {
      console.log("Adding hide")
      reparent(parent, hideButton)
      if (!tagTreeHandler.preventScroll) parent.parentElement.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" })
    } else {
      // Delete all show buttons under these buttons
      let all = document.querySelectorAll("[data-tag-name='braided_ponytail'] > ul > li .show-implications-button")

      for (let child of all) {
        child.parentElement.parentElement.remove()
      }
    }
  })

  return li
}

function createTagTree(tag, depth = 1) {
  let li = document.createElement("li")
  if (!tag.thisTag.active && !tag.parents.some(t => t.thisTag.fetchedChildren)) li.classList.add("hidden")

  let details = document.createElement("details")
  details.open = tag.thisTag.active
  details.setAttribute("data-tag-name", tag.thisTag.name)
  li.appendChild(details)

  let summary = document.createElement("summary")
  summary.classList.add(`${CATEGORIES[tag.thisTag.category]}-tag-category`, "tag", "px-2")
  details.appendChild(summary)

  summary.addEventListener("click", (e) => {
    e.stopImmediatePropagation()

    if (e.target.parentElement.open) {
      for (let child of e.target.parentElement.querySelectorAll(":scope > ul > li > details[open]")) {
        child.firstChild.click()
      }

      for (let child of e.target.parentElement.querySelectorAll(".has-active-children")) {
        child.classList.remove("has-active-children")
      }

      tagTreeHandler.tags = removeFromText(tagTreeHandler.tags, tag.thisTag.name).trim()
    } else {
      tagTreeHandler.tags = addToText(tagTreeHandler.tags, tag.thisTag.name)
      tagTreeHandler.tags = tagTreeHandler.tags.trim()
    }

    if (!tagTreeHandler.preventClicks) {
      tagTreeHandler.preventClicks = true
      let allOfTheSame = document.querySelectorAll(`[data-tag-name='${tag.thisTag.name}']`)

      for (let child of allOfTheSame) {
        if (child == e.target.parentElement) continue
        child.firstChild.click()
      }

      tagTreeHandler.preventClicks = false
    }
  })

  let p = document.createElement("p")
  p.innerText = toTitle(tag.thisTag.name)
  summary.appendChild(p)

  let a = document.createElement("a")
  a.href = `https://e621.net/wiki_pages/show_or_new?title=${tag.thisTag.name}`
  a.target = "_blank"
  a.innerText = "?"
  a.classList.add("ml-3")
  p.appendChild(a)

  let ul = document.createElement("ul")
  details.append(ul)

  if (tag.children.length > 0) {
    tag.children.sort((a, b) => {
      let startingDigitsA = a.thisTag.name.match(/^\d+/)
      let startingDigitsB = b.thisTag.name.match(/^\d+/)
      if (startingDigitsA && startingDigitsB) {
        return parseInt(startingDigitsA[0]) - parseInt(startingDigitsB[0])
      }
      return a.thisTag.name.localeCompare(b.thisTag.name)
    })

    for (let child of tag.children) {
      ul.appendChild(createTagTree(child, depth + 1))
    }
  }

  if (!tag.thisTag.fetchedChildren) ul.appendChild(createImplicationRequester(tag.thisTag.name, depth + 1, tag))

  li.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopImmediatePropagation()

    if (details.open) {
      let lastChild = ul.lastChild.firstChild.firstChild

      if (lastChild.classList.contains("hide-implications-button") || lastChild.classList.contains("show-implications-button")) {
        lastChild.click()
      }
    }
  })


  return li
}

let tagTreeHandler = {
  currentStructure: {},
  tags: "",
  preventClicks: false,
  preventScroll: false,
  async slideUpdated() {
    tagTreeHandler.buttons = {}

    while (uiElements.tagContainer.firstChild) {
      uiElements.tagContainer.removeChild(uiElements.tagContainer.firstChild)
    }

    let slide = slideshowController.getCurrentSlide()

    let index = slideshowController.currentSlideNumber

    let allImplications = {}

    tagTreeHandler.tags = slide.tags

    await getImplications(tagTreeHandler.tags, allImplications)

    if (slideshowController.currentSlideNumber == index) {
      let structure = resolveTagStructure(allImplications, tagTreeHandler.tags)

      tagTreeHandler.currentStructure = structure

      let asArray = Object.values(structure)

      asArray.sort((a, b) => {
        let startingDigitsA = a.thisTag.name.match(/^\d+/)
        let startingDigitsB = b.thisTag.name.match(/^\d+/)
        if (startingDigitsA && startingDigitsB) {
          return parseInt(startingDigitsA[0]) - parseInt(startingDigitsB[0])
        }
        return a.thisTag.name.localeCompare(b.thisTag.name)
      })

      for (let group of asArray) {
        let ul = document.createElement("ul")
        ul.classList.add("tree")
        ul.classList.add("mb-3")
        uiElements.tagContainer.appendChild(ul)

        ul.appendChild(createTagTree(group))
      }
    }
  }
}

function unwind(group, addedTags = []) {
  let newGroup = {}
  group.thisTag.active = true
  group.thisTag.fetchedChildren = false

  addedTags.push(group.thisTag.name)

  if (group.parents.length > 0) {
    let child = {
      parents: [],
      children: [],
      thisTag: group.thisTag
    }
    for (let parent of group.parents) {
      newGroup[parent.thisTag.name] = unwind(parent, addedTags)[0]
      child.parents.push(newGroup[parent.thisTag.name])
      newGroup[parent.thisTag.name].children.push(child)
    }
  } else {
    newGroup = {
      parents: [],
      children: [],
      thisTag: group.thisTag
    }
  }
  return [newGroup, addedTags]
}

// TODO: If the tag exists multiple times, it might desync with other instances of the same tag
//       Turning a tag on that implies multiple tags will not properly resolve tags other than the parent it was added from
//       Changing slides breaks tags

async function addNewTag(tag) {
  if (tag.trim() == "") return

  let allImplications = {}
  await getImplications(tag.trim(), allImplications, "allparents")

  let t = Object.values(allImplications)[0]

  let [structure, addedTags] = unwind(t)

  for (let tag of addedTags) {
    tagTreeHandler.tags = addToText(tagTreeHandler.tags, tag)
    tagTreeHandler.tags = tagTreeHandler.tags.trim()

  }

  // let realStructure = findChildInStructure(tagTreeHandler.currentStructure, t.thisTag.name)

  // Some parts may be in there, some might not. Need to resolve all of manually :D

  if (!realStructure) {
    console.log(structure)
    // let name = Object.keys(structure)[0]
    // tagTreeHandler.currentStructure[name] = structure[name]
  }

  for (let tag of addedTags) {
    let allTags = document.querySelectorAll(`[data-tag-name='${tag}']`)
    tagTreeHandler.preventClicks = true

    for (let child of allTags) {
      if (!child.open) {
        child.firstChild.click()
        child.open = true
      }

      let last = child.parentElement.parentElement.lastChild

      if (last.firstChild.firstChild.classList.contains("show-implications-button")) {
        last.classList.add("has-active-children")
      }
    }

    tagTreeHandler.preventClicks = false
  }
}

uiElements.addTagButton.addEventListener("click", async () => {
  addNewTag(uiElements.newTagInput.value)
})

uiElements.newTagInput.addEventListener("keypress", (e) => {
  if (e.key == "Enter") {
    addNewTag(uiElements.newTagInput.value)
  }
})

uiElements.copyTagsButton.addEventListener("click", () => {
  navigator.clipboard.writeText(tagTreeHandler.tags)
})

uiElements.showCurrentButton.addEventListener("click", () => {
  for (let details of document.querySelectorAll(".hidden > details[open]")) {
    details.parentElement.classList.remove("hidden")
  }
})

uiElements.showAllButton.addEventListener("click", () => {
  tagTreeHandler.preventScroll = true

  for (let button of document.querySelectorAll(".show-implications-button")) {
    button.click()
  }
})

uiElements.collapseAllButton.addEventListener("click", () => {
  tagTreeHandler.preventScroll = true

  for (let button of document.querySelectorAll(".show-implications-button")) {
    let li = button.parentElement.parentElement
    let parent = li.parentElement
    for (let child of parent.children) {
      child.classList.add("hidden")
    }

    li.classList.remove("hidden")

    if (parent.querySelectorAll("ul > li > details[open]").length != 0) {
      li.classList.add("has-active-children")
    }
  }

  for (let button of document.querySelectorAll(".hide-implications-button")) {
    button.click()
  }

  tagTreeHandler.preventScroll = false

  uiElements.tagContainer.scroll({ behavior: "smooth", top: 0 })
})