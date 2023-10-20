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

  let requesting = false

  let parent = null

  let reparent = (sum) => {
    let li = document.createElement("li")
    parent.appendChild(li)

    let newDetails = document.createElement("details")
    li.appendChild(newDetails)

    newDetails.appendChild(sum)

    return li
  }

  hideButton.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopImmediatePropagation()

    for (let child of parent.children) {
      child.classList.add("hidden")
    }

    parent.parentElement.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" })

    hideButton.parentElement.parentElement.remove()

    let li = reparent(showButton)

    if (parent.querySelectorAll("ul > li > details[open]").length != 0) {
      li.classList.add("has-active-children")
    }
  })

  showButton.addEventListener("click", async (e) => {
    if (parentGroup.thisTag.fetchedChildren) {
      for (let child of parent.children) {
        child.classList.remove("hidden")
      }

      showButton.parentElement.parentElement.remove()

      reparent(hideButton)

      parent.parentElement.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" })

      return
    }

    if (!parent) parent = li.parentElement
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
      let p = child.parents.find(p => p.thisTag.name == tagName)
      p.thisTag.fetchedChildren = true
      parent.appendChild(createTagTree(child, depth))
    }

    parent.parentElement.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" })

    showButton.remove()
    reparent(hideButton)
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
    if (e.target.parentElement.open) {
      let children = e.target.parentElement.querySelectorAll(":scope > ul > li > details[open]")

      for (let child of children) {
        child.firstChild.click()
      }

      tagTreeHandler.tags = removeFromText(tagTreeHandler.tags, tag.thisTag.name).trim()
    } else {
      if (!tagTreeHandler.tags.includes(tag.thisTag.name)) {
        tagTreeHandler.tags += ` ${tag.thisTag.name}`
        tagTreeHandler.tags = tagTreeHandler.tags.trim()
      }
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

  if (!tag.thisTag.fetchedChildren) {
    ul.appendChild(createImplicationRequester(tag.thisTag.name, depth + 1, tag))
  }

  return li
}

let tagTreeHandler = {
  currentStructure: {},
  tags: "",
  preventClicks: false,
  async slideUpdated() {
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

uiElements.copyTagsButton.addEventListener("click", () => {
  navigator.clipboard.writeText(tagTreeHandler.tags)
})