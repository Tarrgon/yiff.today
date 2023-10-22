const BACKGROUND_COLORS = ["#b4c7d9", "#f2ac08", "god is surely dead since this is empty", "#d0d", "#0a0", "#ed5d1f", "#ff3d3d", "#fff", "#282"]
const CATEGORIES = ["general", "artist", "dead god", "copyright", "character", "species", "invalid", "meta", "lore"]
const CATEGORIES_SORTED = ["artist", "copyright", "character", "species", "general", "meta", "lore"] // This is how e6 shows categories

// (c) 2018 Chris Ferdinandi, MIT License, https://gomakethings.com
function isOutOfViewport(elem, parent) {
  let parentBounding = parent.getBoundingClientRect()
  let bounding = elem.getBoundingClientRect()

  let out = {}
  out.top = bounding.bottom < parentBounding.top
  out.left = bounding.right < parentBounding.left
  out.bottom = bounding.top > (parentBounding.y + parentBounding.height)
  out.right = bounding.left > (parentBounding.x + parentBounding.width)
  out.any = out.top || out.left || out.bottom || out.right
  out.all = out.top && out.left && out.bottom && out.right

  return out
}

function childSorter(a, b) {
  let categoryPositionA = CATEGORIES_SORTED.indexOf(CATEGORIES[a.thisTag.category])
  let categoryPositionB = CATEGORIES_SORTED.indexOf(CATEGORIES[b.thisTag.category])

  if (categoryPositionA != categoryPositionB) {
    return categoryPositionA - categoryPositionB
  }

  let startingDigitsA = a.thisTag.name.match(/^\d+/)
  let startingDigitsB = b.thisTag.name.match(/^\d+/)
  if (startingDigitsA && startingDigitsB) {
    return parseInt(startingDigitsA[0]) - parseInt(startingDigitsB[0])
  }
  return a.thisTag.name.localeCompare(b.thisTag.name)
}

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
    implications.thisTag.showedChildren = false
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

function createImplicationRequester(parentDetails, tagName, depth, parentGroup) {
  let expandButton = document.createElement("a")
  expandButton.style.position = "absolute"
  expandButton.classList.add("ml-1", "show-implications-button")
  parentDetails.appendChild(expandButton)

  let sup = document.createElement("sup")
  sup.innerText = "[expand]"
  expandButton.appendChild(sup)

  if (!parentGroup.thisTag.fetchedChildren) expandButton.classList.add("hidden")

  let collapseButton = document.createElement("a")
  collapseButton.style.position = "absolute"
  collapseButton.classList.add("ml-1", "hide-implications-button")
  parentDetails.appendChild(collapseButton)

  let sup2 = document.createElement("sup")
  sup2.innerText = "[collapse]"
  collapseButton.appendChild(sup2)

  collapseButton.classList.add("hidden")

  let searchButton = document.createElement("a")
  searchButton.style.position = "absolute"
  searchButton.classList.add("ml-1", "show-implications-button")
  parentDetails.appendChild(searchButton)

  let sup3 = document.createElement("sup")
  sup3.innerText = "[search]"
  searchButton.appendChild(sup3)

  if (parentGroup.thisTag.fetchedChildren) searchButton.classList.add("hidden")

  let requesting = false

  let relatedList = null

  let collapse = (e) => {
    e.preventDefault()
    e.stopImmediatePropagation()

    tagTreeHandler.preventScroll = false

    for (let child of relatedList.children) {
      child.classList.add("hidden")
    }

    // hideButton?.parentElement?.parentElement?.remove()

    // let li = reparent(parent, showButton)

    if (isOutOfViewport(relatedList.lastChild, uiElements.tagContainer).top) relatedList.lastChild.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" })

    if (!parentGroup.thisTag.showedChildren) {
      searchButton.classList.remove("hidden")
    } else {
      expandButton.classList.remove("hidden")
    }

    collapseButton.classList.add("hidden")

    expandButton.classList.remove("has-active-children")
    searchButton.classList.remove("has-active-children")

    if (relatedList.querySelectorAll("li > details[open]").length != 0) {
      console.log(relatedList.querySelectorAll("li > details[open]"))
      expandButton.classList.add("has-active-children")
      searchButton.classList.add("has-active-children")
    }
  }

  let expand = async (e) => {
    e.preventDefault()
    e.stopImmediatePropagation()
    if (!relatedList) relatedList = parentDetails.lastChild
    if (parentGroup.thisTag.fetchedChildren) {
      for (let child of relatedList.children) {
        child.classList.remove("hidden")
      }

      if (!parentGroup.thisTag.showedChildren) {
        let cached = implicationsCache[parentGroup.thisTag.name]

        for (let child of cached.children) {
          if (!parentGroup.children.find(t => t.thisTag.name == child.name)) {
            parentGroup.children.push({
              children: [],
              parents: [parentGroup],
              thisTag: {
                id: child.id,
                name: child.name,
                category: child.category,
                fetchedChildren: implicationsCache[child.name] != null,
                showedChildren: false
              }
            })
          }
        }

        parentGroup.children.sort(childSorter)

        while (relatedList.firstChild) {
          relatedList.removeChild(relatedList.firstChild)
        }

        for (let child of parentGroup.children) {
          let p = child.parents.find(p => p.thisTag.name == tagName)
          p.thisTag.fetchedChildren = true
          p.thisTag.showedChildren = true
          relatedList.appendChild(createTagTree(child, depth, true))
        }
      }

      parentGroup.thisTag.showedChildren = true

      if (!tagTreeHandler.preventScroll && isOutOfViewport(relatedList.lastChild, uiElements.tagContainer).bottom) relatedList.lastChild.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" })

      searchButton.classList.add("hidden")
      expandButton.classList.add("hidden")
      collapseButton.classList.remove("hidden")

      return
    }

    if (tagTreeHandler.preventNewRequests) {
      for (let child of relatedList.children) {
        child.classList.remove("hidden")
      }

      expandButton.classList.remove("has-active-children")
      searchButton.classList.remove("has-active-children")

      return
    }

    if (requesting) return
    requesting = true
    parentGroup.thisTag.fetchedChildren = true
    parentGroup.thisTag.showedChildren = true

    let allImplications = {}
    await getImplications(tagName, allImplications, "children")

    let structure = resolveTagStructure(allImplications, tagTreeHandler.tags)

    let realStructure = findChildInStructure(tagTreeHandler.currentStructure, tagName)

    console.log(tagName)

    realStructure.children = (realStructure.children || []).concat(structure[tagName].children).filter((c, i, arr) => arr.findIndex(a => a.thisTag.name == c.thisTag.name) == i)

    realStructure.children.sort(childSorter)

    while (relatedList.firstChild) {
      relatedList.removeChild(relatedList.firstChild)
    }

    for (let child of realStructure.children) {
      let p = child.parents.find(p => p.thisTag.name == tagName)
      p.thisTag.fetchedChildren = true
      p.thisTag.showedChildren = true
      relatedList.appendChild(createTagTree(child, depth, true))
    }

    let otherParents = Array.from(document.querySelectorAll(`[data-tag-name='${parentGroup.thisTag.name}']`))
      .map(b => b.lastChild)

    for (let p of otherParents) {
      if (p == relatedList) continue
      for (let child of realStructure.children) {
        p.appendChild(createTagTree(child, depth, true, true))
      }
    }

    if (realStructure.children.length > 0) {
      searchButton.classList.add("hidden")
      expandButton.classList.add("hidden")
      collapseButton.classList.remove("hidden")
      // reparent(parent, hideButton)
      if (!tagTreeHandler.preventScroll && isOutOfViewport(relatedList.lastChild, uiElements.tagContainer).bottom) relatedList.lastChild.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" })
    } else {
      // Delete all show buttons under these buttons
      let all = document.querySelectorAll(`[data-tag-name='${tagName}'] > .show-implications-button`)

      for (let child of all) {
        child.remove()
      }
    }
  }

  expandButton.addEventListener("click", expand)
  searchButton.addEventListener("click", expand)

  collapseButton.addEventListener("click", collapse)

  // let li = document.createElement("li")

  // let details = document.createElement("details")
  // li.appendChild(details)

  // let showButton = document.createElement("summary")
  // showButton.classList.add("show-implications-button")
  // showButton.innerText = "Show Implications"
  // details.appendChild(showButton)

  // let hideButton = document.createElement("summary")
  // hideButton.classList.add("hide-implications-button")
  // hideButton.innerText = "Hide Implications"

  // hideButton.addEventListener("click", (e) => {
  //   e.preventDefault()
  //   e.stopImmediatePropagation()

  //   tagTreeHandler.preventScroll = false

  //   for (let child of parent.children) {
  //     child.classList.add("hidden")
  //   }

  //   hideButton?.parentElement?.parentElement?.remove()

  //   let li = reparent(parent, showButton)

  //   if (isOutOfViewport(showButton, uiElements.tagContainer).top) showButton.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" })

  //   if (parent.querySelectorAll("ul > li > details[open]").length != 0) {
  //     li.classList.add("has-active-children")
  //   }
  // })

  // showButton.addEventListener("click", async (e) => {
  //   e.preventDefault()
  //   e.stopImmediatePropagation()
  //   if (!parent) parent = li.parentElement
  //   if (parentGroup.thisTag.fetchedChildren) {
  //     for (let child of parent.children) {
  //       child.classList.remove("hidden")
  //     }

  //     showButton?.parentElement?.parentElement?.remove()

  //     if (!parentGroup.thisTag.showedChildren) {
  //       let cached = implicationsCache[parentGroup.thisTag.name]

  //       for (let child of cached.children) {
  //         if (!parentGroup.children.find(t => t.thisTag.name == child.name)) {
  //           parentGroup.children.push({
  //             children: [],
  //             parents: [parentGroup],
  //             thisTag: {
  //               id: child.id,
  //               name: child.name,
  //               category: child.category,
  //               fetchedChildren: implicationsCache[child.name] != null,
  //               showedChildren: false
  //             }
  //           })
  //         }
  //       }

  //       parentGroup.children.sort(childSorter)

  //       while (parent.firstChild) {
  //         parent.removeChild(parent.firstChild)
  //       }

  //       for (let child of parentGroup.children) {
  //         let p = child.parents.find(p => p.thisTag.name == tagName)
  //         p.thisTag.fetchedChildren = true
  //         p.thisTag.showedChildren = true
  //         parent.appendChild(createTagTree(child, depth))
  //       }
  //     }

  //     reparent(parent, hideButton)

  //     parentGroup.thisTag.showedChildren = true

  //     if (!tagTreeHandler.preventScroll && isOutOfViewport(hideButton, uiElements.tagContainer).bottom) hideButton.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" })

  //     return
  //   }

  //   if (tagTreeHandler.preventNewRequests) {
  //     for (let child of parent.children) {
  //       child.classList.remove("hidden")
  //     }

  //     li.classList.remove("has-active-children")

  //     return
  //   }

  //   if (requesting) return
  //   requesting = true
  //   parentGroup.thisTag.fetchedChildren = true
  //   parentGroup.thisTag.showedChildren = true

  //   let allImplications = {}
  //   await getImplications(tagName, allImplications, "children")

  //   let structure = resolveTagStructure(allImplications, tagTreeHandler.tags)

  //   let realStructure = findChildInStructure(tagTreeHandler.currentStructure, tagName)

  //   realStructure.children = realStructure.children.concat(structure[tagName].children).filter((c, i, arr) => arr.findIndex(a => a.thisTag.name == c.thisTag.name) == i)

  //   realStructure.children.sort(childSorter)

  //   while (parent.firstChild) {
  //     parent.removeChild(parent.firstChild)
  //   }

  //   for (let child of realStructure.children) {
  //     let p = child.parents.find(p => p.thisTag.name == tagName)
  //     p.thisTag.fetchedChildren = true
  //     p.thisTag.showedChildren = true
  //     parent.appendChild(createTagTree(child, depth))
  //   }

  //   let otherParents = Array.from(document.querySelectorAll(`[data-tag-name='${parentGroup.thisTag.name}'] > ul > li > details > .show-implications-button`))
  //     .filter(b => b != showButton).map(b => b.parentElement.parentElement.parentElement)

  //   for (let p of otherParents) {
  //     let pFirst = p.firstChild
  //     for (let child of realStructure.children) {
  //       p.insertBefore(createTagTree(child, depth, false, true), pFirst)
  //     }
  //   }

  //   showButton.remove()
  //   if (realStructure.children.length > 0) {
  //     reparent(parent, hideButton)
  //     if (!tagTreeHandler.preventScroll && isOutOfViewport(hideButton, uiElements.tagContainer).bottom) hideButton.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" })
  //   } else {
  //     // Delete all show buttons under these buttons
  //     let all = document.querySelectorAll(`[data-tag-name='${tagName}'] > ul > li .show-implications-button`)

  //     for (let child of all) {
  //       child.parentElement.parentElement.remove()
  //     }
  //   }
  // })

  // return li
}

function createTagTree(tag, depth = 1, forceShowButton = false, hidden = false) {
  if (forceShowButton) {
    tag.thisTag.showedChildren = false
  }

  let li = document.createElement("li")
  if (hidden || (!tag.thisTag.active && !tag.parents.some(t => t.thisTag.fetchedChildren))) li.classList.add("hidden")

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

        let anyActive = !e.target.parentElement.open || child.parentElement.parentElement.querySelectorAll(`:scope > li > details[open]`).length - 1 > 0

        if (!e.target.parentElement.open && !child.parentElement.parentElement.querySelector("details[open]")) {
          child.parentElement.parentElement.querySelector(":scope > li > details > .show-implications-button")?.parentElement?.parentElement?.classList?.add("has-active-children")
        } else if (!anyActive) {
          child.parentElement.parentElement.querySelector(":scope > li > details > .show-implications-button")?.parentElement?.parentElement?.classList?.remove("has-active-children")
        }
        child.firstChild.click()
      }

      tagTreeHandler.preventClicks = false
    }
  })

  let p = document.createElement("p")
  p.innerText = toTitle(tag.thisTag.name)
  summary.appendChild(p)

  if (!tag.thisTag.fetchedChildren || forceShowButton) createImplicationRequester(details, tag.thisTag.name, depth + 1, tag)

  let a = document.createElement("a")
  a.href = `https://e621.net/wiki_pages/show_or_new?title=${tag.thisTag.name}`
  a.target = "_blank"
  a.innerText = "?"
  a.classList.add("ml-1")
  p.appendChild(a)

  let ul = document.createElement("ul")
  details.append(ul)

  if (tag.children.length > 0) {
    tag.children.sort(childSorter)

    for (let child of tag.children) {
      ul.appendChild(createTagTree(child, depth + 1, forceShowButton, hidden))
    }
  }

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
  unchangedTags: "",
  preventClicks: false,
  preventScroll: false,
  lock: false,
  async slideUpdated() {
    tagTreeHandler.buttons = {}

    while (uiElements.tagContainer.firstChild) {
      uiElements.tagContainer.removeChild(uiElements.tagContainer.firstChild)
    }

    let slide = slideshowController.getCurrentSlide()

    let index = slideshowController.currentSlideNumber

    let allImplications = {}

    tagTreeHandler.tags = slide.tags
    tagTreeHandler.unchangedTags = slide.tags

    await getImplications(tagTreeHandler.tags, allImplications)

    if (slideshowController.currentSlideNumber == index) {
      let structure = resolveTagStructure(allImplications, tagTreeHandler.tags)

      tagTreeHandler.currentStructure = structure

      let asArray = Object.values(structure)

      asArray.sort(childSorter)

      for (let group of asArray) {
        let ul = document.createElement("ul")
        ul.classList.add("tree")
        ul.classList.add("mb-3")
        uiElements.tagContainer.appendChild(ul)

        ul.appendChild(createTagTree(group, 1, true))
      }
    }
  }
}

function unwind(current, child, newGroup = {}, addedTags = []) {
  addedTags.push(current.thisTag.name)
  current.thisTag.active = true
  current.thisTag.fetchedChildren = false
  current.thisTag.showedChildren = false

  if (!current.children) current.children = []
  if (child) current.children.push(child)

  current.children.sort(childSorter)

  if (current.parents.length > 0) {
    for (let parent of current.parents) {
      unwind(parent, current, newGroup, addedTags)[0]
    }
  } else {
    newGroup[current.thisTag.name] = {
      thisTag: current.thisTag,
      parents: [],
      children: current.children
    }
  }

  return [newGroup, addedTags]
}

function deepMergeChildren(structure, withStructure) {
  for (let child of withStructure.children) {
    let existing = structure.children.find(t => t.thisTag.name == child.thisTag.name)
    if (existing) {
      existing.thisTag.active = true
      deepMergeChildren(existing, child)
    } else {
      structure.children.push(child)
    }
  }

  structure.children.sort(childSorter)
}

function getChanges() {
  let changes = []

  let tagsNow = tagTreeHandler.tags.split(" ")
  let tagsBefore = tagTreeHandler.unchangedTags.split(" ")

  for (let tag of tagsNow) {
    if (tagsBefore.includes(tag)) {
      changes.push({ tag, change: 0 })
    } else {
      changes.push({ tag, change: 1 })
    }
  }

  for (let tag of tagsBefore) {
    if (!tagsNow.includes(tag)) {
      changes.push({ tag, change: -1 })
    }
  }

  changes.sort((a, b) => {
    if (a.change == 0 && b.change != 0) return 1
    if (b.change == 0 && a.change != 0) return -1

    if (a.change == 1 && b.change == -1) return -1
    if (a.change == -1 && b.change == 1) return 1

    let startingDigitsA = a.tag.match(/^\d+/)
    let startingDigitsB = b.tag.match(/^\d+/)
    if (startingDigitsA && startingDigitsB) {
      return parseInt(startingDigitsA[0]) - parseInt(startingDigitsB[0])
    }

    return a.tag.localeCompare(b.tag)
  })

  return changes
}

// TODO: If the tag exists multiple times, it might desync with other instances of the same tag
//       Turning a tag on that implies multiple tags will not properly resolve tags other than the parent it was added from

async function addNewTag(tag) {
  uiElements.autoCompleteContainer.classList.remove("is-active")
  uiElements.newTagInput.value = ""
  if (tag.trim() == "") return

  tagTreeHandler.preventScroll = false

  let allImplications = {}
  await getImplications(tag.trim(), allImplications, "allparents")

  let t = Object.values(allImplications)[0]

  let [structure, addedTags] = unwind(t)

  for (let tag of addedTags) {
    tagTreeHandler.tags = addToText(tagTreeHandler.tags, tag)
    tagTreeHandler.tags = tagTreeHandler.tags.trim()
  }

  let newTopLevel = []

  for (let [parentName, group] of Object.entries(structure)) {
    let realStructure = findChildInStructure(tagTreeHandler.currentStructure, parentName)

    if (realStructure) {
      deepMergeChildren(realStructure, group)
    } else {
      newTopLevel.push(parentName)
      tagTreeHandler.currentStructure[parentName] = group
    }
  }

  let orderedKeys = Object.values(tagTreeHandler.currentStructure).toSorted(childSorter).map(t => t.thisTag.name)

  for (let updatedKey of Object.keys(structure)) {
    let struct = findChildInStructure(tagTreeHandler.currentStructure, updatedKey)

    let allTags = document.querySelectorAll(`[data-tag-name='${updatedKey}']`)

    if (allTags.length > 0) {
      for (let child of allTags) {
        let li = child.parentElement
        let parent = li.parentElement

        li.remove()

        element = parent

        parent.appendChild(createTagTree(struct, 1, true))
      }
    } else {
      let next = orderedKeys.indexOf(updatedKey) + 1

      if (next >= orderedKeys.length) {
        let ul = document.createElement("ul")
        ul.classList.add("tree")
        ul.classList.add("mb-3")
        uiElements.tagContainer.appendChild(ul)

        ul.appendChild(createTagTree(struct, 1, true))
      } else {
        let topLevelAfter = document.querySelector(`.tree > li > [data-tag-name='${orderedKeys[next]}']`)

        let ul = document.createElement("ul")
        ul.classList.add("tree")
        ul.classList.add("mb-3")
        uiElements.tagContainer.insertBefore(ul, topLevelAfter.parentElement.parentElement)

        ul.appendChild(createTagTree(struct, 1, true))
      }
    }
  }

  if (!newTopLevel.includes(tag.trim())) {
    let struct = findChildInStructure(tagTreeHandler.currentStructure, tag.trim())

    let ul = document.createElement("ul")
    ul.classList.add("tree")
    ul.classList.add("mb-3")
    uiElements.tagContainer.appendChild(ul)

    ul.appendChild(createTagTree(struct, 1, true))

    ul.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" })
  }

  tagTreeHandler.preventClicks = true

  for (let tag of addedTags) {
    let allTags = document.querySelectorAll(`[data-tag-name='${tag}']`)

    for (let child of allTags) {
      if (!child.open) {
        child.firstChild.click()
        child.open = true
      }
    }
  }

  tagTreeHandler.preventClicks = false
}

uiElements.addTagButton.addEventListener("click", async () => {
  addNewTag(uiElements.newTagInput.value)
})

uiElements.newTagInput.addEventListener("keypress", (e) => {
  if (e.key == "Enter") {
    addNewTag(uiElements.newTagInput.value)
  }
})

uiElements.newTagInput.addEventListener("input", async (e) => {
  if (uiElements.newTagInput.value.length >= 3) {
    let autoComplete = await e621AutoComplete.autoComplete(uiElements.newTagInput.value)
    if (uiElements.newTagInput.value.length < 3) return // Async hell
    uiElements.autoCompleteContainer.classList.add("is-active")

    while (uiElements.autoCompleteMenu.firstChild) {
      uiElements.autoCompleteMenu.removeChild(uiElements.autoCompleteMenu.firstChild)
    }

    for (let completion of autoComplete) {
      let a = document.createElement("a")
      a.classList.add("dropdown-item", "mb-1")
      a.style.border = "1px solid black"


      if (!completion.antecedent_name) {
        let span = document.createElement("span")
        span.classList.add(`${CATEGORIES[completion.category]}-tag-color`)
        a.appendChild(span)
        span.innerText = completion.name
      } else {
        let span = document.createElement("span")
        span.classList.add(`${CATEGORIES[completion.category]}-tag-color`)
        a.appendChild(span)
        span.innerText = `${completion.antecedent_name} `

        let span2 = document.createElement("span")
        span2.classList.add("has-text-light")
        a.appendChild(span2)
        span2.innerHTML = `&rarr;`

        let span3 = document.createElement("span")
        span3.classList.add(`${CATEGORIES[completion.category]}-tag-color`)
        a.appendChild(span3)
        span3.innerText = ` ${completion.name}`
      }

      let span = document.createElement("span")
      span.classList.add("has-text-light")
      span.innerText = ` (${completion.post_count})`
      a.appendChild(span)

      a.addEventListener("click", (e) => {
        e.preventDefault()

        addNewTag(completion.name)
      })

      uiElements.autoCompleteMenu.appendChild(a)
    }
  } else {
    uiElements.autoCompleteContainer.classList.remove("is-active")
  }
})

uiElements.submitChangesButton.addEventListener("click", () => {
  uiElements.reviewChangesModal.classList.add("is-active")

  while (uiElements.tagChangesReview.firstChild) {
    uiElements.tagChangesReview.removeChild(uiElements.tagChangesReview.firstChild)
  }

  let changes = getChanges()

  for (let change of changes) {
    if (change.change == 0) {
      let span = document.createElement("span")
      span.classList.add("has-text-grey-lighter")
      span.innerText = `${change.tag} `
      uiElements.tagChangesReview.appendChild(span)
    } else if (change.change == -1) {
      let span = document.createElement("span")
      span.classList.add("has-text-danger")
      span.innerText = `-${change.tag} `
      uiElements.tagChangesReview.appendChild(span)
    } else if (change.change == 1) {
      let span = document.createElement("span")
      span.classList.add("has-text-success")
      span.innerText = `+${change.tag} `
      uiElements.tagChangesReview.appendChild(span)
    }
  }

  uiElements.tagChangesReview.style.height = `${uiElements.tagContainer.clientHeight / 1.5}px`
})

uiElements.confirmSubmitButton.addEventListener("click", async () => {
  if (login.e621Username.trim() == "" || login.e621ApiKey.trim() == "") {
    document.body.scrollTo({
      top: document.body.scrollHeight,
      left: 0,
      behavior: "smooth"
    })

    return
  }

  if (tagTreeHandler.lock) return
  tagTreeHandler.lock = true

  let changes = getChanges().filter(t => t.change != 0)

  let tagDiff = changes.map(t => t.change == -1 ? `-${t.tag}` : t.tag).join(" ").trim()

  if (tagDiff.length == 0) return

  let body = new URLSearchParams()
  body.append("post[tag_string_diff]", tagDiff)
  body.append("post[old_tag_string]", tagTreeHandler.unchangedTags)
  body.append("post[edit_reason]", "Visual Tag Edit yiff.today/visualtagger")
  body.append("_method", "PATCH")

  uiElements.closeReviewButton.click()

  try {
    showLoadingScreen()

    let res = await fetch(`https://e621.net/posts/${slideshowController.getCurrentSlide().id}.json`, {
      method: "POST",
      headers: {
        "User-Agent": "Yiff.Today VisualTagger (by DefinitelyNotAFurry4)",
        Authorization: `Basic ${btoa(`${login.e621Username}:${login.e621ApiKey}`)}`
      },
      body
    })

    if (res.ok) {
      showSuccessScreen()
    } else {
      showFailureScreen(res.status)
    }
  } catch (e) {
    console.error(e)

    showFailureScreen("unk")
  }


  tagTreeHandler.lock = false
})

function showLoadingScreen() {
  uiElements.responseText.innerText = "Loading"

  uiElements.responseModal.classList.add("is-active")
  uiElements.closeResponseButton.classList.add("hidden")
}

function showSuccessScreen() {
  uiElements.responseText.innerText = "Success"

  uiElements.responseModal.classList.add("is-active")

  uiElements.closeResponseButton.classList.remove("hidden")
}

function showFailureScreen(status) {
  uiElements.responseText.innerText = `Failure (${status})`

  uiElements.responseModal.classList.add("is-active")

  uiElements.closeResponseButton.classList.remove("hidden")
}

uiElements.closeReviewButton.addEventListener("click", () => {
  uiElements.reviewChangesModal.classList.remove("is-active")
})

uiElements.closeResponseButton.addEventListener("click", () => {
  uiElements.responseModal.classList.remove("is-active")
})

uiElements.copyTagsButton.addEventListener("click", () => {
  navigator.clipboard.writeText(tagTreeHandler.tags)
})

uiElements.showCurrentButton.addEventListener("click", () => {
  tagTreeHandler.preventScroll = true
  uiElements.collapseAllButton.click()
  tagTreeHandler.preventScroll = false

  for (let details of document.querySelectorAll(".hidden > details[open]")) {
    details.parentElement.classList.remove("hidden")
  }

  for (let active of document.querySelectorAll(".has-active-children")) {
    active.classList.remove("has-active-children")
  }
})

uiElements.showAllButton.addEventListener("click", () => {
  tagTreeHandler.preventScroll = true
  tagTreeHandler.preventNewRequests = true

  for (let button of document.querySelectorAll(".show-implications-button")) {
    button.click()
  }

  for (let active of document.querySelectorAll(".has-active-children")) {
    active.classList.remove("has-active-children")
  }

  tagTreeHandler.preventNewRequests = false
})

uiElements.collapseAllButton.addEventListener("click", () => {
  let noScroll = tagTreeHandler.preventScroll
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

  if (!noScroll) uiElements.tagContainer.scroll({ behavior: "smooth", top: 0 })
})

hotkeys("enter", (e) => {
  e.preventDefault()
  if (!uiElements.reviewChangesModal.classList.contains("is-active")) {
    uiElements.submitChangesButton.click()
  } /*else {
    uiElements.confirmSubmitButton.click()
  }*/
})

hotkeys("escape", (e) => {
  e.preventDefault()
  if (uiElements.reviewChangesModal.classList.contains("is-active")) {
    uiElements.closeReviewButton.click()
  }

  if (uiElements.responseModal.classList.contains("is-active")) {
    uiElements.closeResponseButton.click()
  }
})