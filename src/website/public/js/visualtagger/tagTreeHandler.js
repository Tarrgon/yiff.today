const BACKGROUND_COLORS = ["#b4c7d9", "#f2ac08", "god is surely dead since this is empty", "#d0d", "#0a0", "#ed5d1f", "#ff3d3d", "#fff", "#282", "#03fcdb"]
const CATEGORIES = ["general", "artist", "dead god", "copyright", "character", "species", "invalid", "meta", "lore", "NEWTAG"]
const CATEGORIES_SORTED = ["NEWTAG", "artist", "copyright", "character", "species", "general", "meta", "lore"] // This is how e6 shows categories

// (c) 2018 Chris Ferdinandi, MIT License, https://gomakethings.com
function isOutOfViewport(elem, parent) {
  if (parent) {
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
  } else {
    let bounding = elem.getBoundingClientRect()

    let out = {}
    out.top = bounding.top < 0
    out.left = bounding.left < 0
    out.bottom = bounding.bottom > (window.innerHeight || document.documentElement.clientHeight)
    out.right = bounding.right > (window.innerWidth || document.documentElement.clientWidth)
    out.any = out.top || out.left || out.bottom || out.right
    out.all = out.top && out.left && out.bottom && out.right

    return out
  }
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

let progressMade = true

async function resolveTagStructure(unresolvedImplications, tags, structure = {}) {
  if (Object.entries(unresolvedImplications).length == 0) return structure

  if (!progressMade) {
    progressMade = true
    for (let [tagName, data] of Object.entries(unresolvedImplications)) {
      for (let parent of data.parents) {
        tagTreeHandler.tags = addToText(tagTreeHandler.tags, parent.name)
        updateTagCount()
        tags = tagTreeHandler.tags
        let allImplications = {}
        await getImplications(parent.name, allImplications)

        let struct = await resolveTagStructure(allImplications, tags)

        for (let [k, v] of Object.entries(struct)) {
          structure[k] = v
        }
      }
    }
    // showFailureScreen("Failure", `Unable to resolve tags, please report this issue and post id: ${slideshowController.getCurrentSlide().id}`)
    // return
  }

  progressMade = false

  let splitTags = tags.split(" ")

  for (let [tagName, implications] of Object.entries(unresolvedImplications).toSorted((a, b) => a[1].parents.length - b[1].parents.length)) {
    implications.thisTag.showedChildren = false
    if (implications.parents.length == 0) {
      progressMade = true
      implications.thisTag.active = splitTags.includes(implications.thisTag.name)
      implications.thisTag.fetchedChildren = false
      let imps = {
        parents: [],
        thisTag: implications.thisTag
      }

      imps.children = implications.children.map(imp => {
        imp.active = splitTags.includes(imp.name)
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
          progressMade = true
          let index = thisParent.children.findIndex(c => c.thisTag.id == implications.thisTag.id)

          if (index == -1) {
            implications.thisTag.active = splitTags.includes(implications.thisTag.name)
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

  return await resolveTagStructure(unresolvedImplications, tags, structure)
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
    hotkeys.setScope("tagging")

    e.preventDefault()
    e.stopImmediatePropagation()

    if (!relatedList) relatedList = parentDetails.lastChild

    for (let child of relatedList.children) {
      child.classList.add("hidden")
    }

    // hideButton?.parentElement?.parentElement?.remove()

    // let li = reparent(parent, showButton)

    if (!tagTreeHandler.preventScroll && relatedList.parentElement && isOutOfViewport(relatedList.parentElement, uiElements.tagContainer).top) {
      uiElements.tagContainer.scrollTo({ left: 0, top: relatedList.parentElement.parentElement.offsetTop, behavior: "smooth" })
    }

    if (!parentGroup.thisTag.showedChildren) {
      searchButton.classList.remove("hidden")
    } else {
      expandButton.classList.remove("hidden")
    }

    collapseButton.classList.add("hidden")

    expandButton.classList.remove("has-active-children")
    searchButton.classList.remove("has-active-children")

    if (relatedList.querySelectorAll("li > details[open]").length != 0) {
      expandButton.classList.add("has-active-children")
      searchButton.classList.add("has-active-children")
    }
  }

  let expand = async (e) => {
    hotkeys.setScope("tagging")

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
          relatedList.appendChild(createTagTree(child, depth, false))
        }
      }

      parentGroup.thisTag.showedChildren = true

      if (!tagTreeHandler.preventScroll && relatedList.lastChild && isOutOfViewport(relatedList.lastChild, uiElements.tagContainer).bottom) relatedList.lastChild.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" })

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

    let structure = await resolveTagStructure(allImplications, tagTreeHandler.tags)

    let realStructure = findChildInStructure(tagTreeHandler.currentStructure, tagName)

    realStructure.children = (realStructure.children || []).concat(structure[tagName].children).filter((c, i, arr) => arr.findIndex(a => a.thisTag.name == c.thisTag.name) == i)

    realStructure.children.sort(childSorter)

    while (relatedList.firstChild) {
      relatedList.removeChild(relatedList.firstChild)
    }

    for (let child of realStructure.children) {
      let p = child.parents.find(p => p.thisTag.name == tagName)
      p.thisTag.fetchedChildren = true
      p.thisTag.showedChildren = true
      relatedList.appendChild(createTagTree(child, depth, false))
    }

    let otherParents = Array.from(document.querySelectorAll(`[data-tag-name=\"${parentGroup.thisTag.name}\"]`))
      .map(b => b.lastChild)

    for (let p of otherParents) {
      if (p == relatedList) continue
      while (p.firstChild) {
        p.removeChild(p.firstChild)
      }

      for (let child of realStructure.children) {
        p.appendChild(createTagTree(child, depth, false, true))
      }
    }

    if (realStructure.children.length > 0) {
      let all = document.querySelectorAll(`[data-tag-name=\"${tagName}\"] > .show-implications-button`)

      for (let child of all) {
        if (child.innerText == "[search]") {
          child.classList.add("hidden")
        } else {
          child.classList.remove("hidden")
        }
      }

      searchButton.classList.add("hidden")
      expandButton.classList.add("hidden")
      collapseButton.classList.remove("hidden")
      // reparent(parent, hideButton)
      if (!tagTreeHandler.preventScroll && relatedList.lastChild && isOutOfViewport(relatedList.lastChild, uiElements.tagContainer).bottom) relatedList.lastChild.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" })
    } else {
      // Delete all show buttons under these buttons
      let all = document.querySelectorAll(`[data-tag-name=\"${tagName}\"] > .show-implications-button`)

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

  //   let structure = await resolveTagStructure(allImplications, tagTreeHandler.tags)

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

  //   let otherParents = Array.from(document.querySelectorAll(`[data-tag-name=\"${parentGroup.thisTag.name}\"] > ul > li > details > .show-implications-button`))
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
  //     let all = document.querySelectorAll(`[data-tag-name=\"${tagName}\"] > ul > li .show-implications-button`)

  //     for (let child of all) {
  //       child.parentElement.parentElement.remove()
  //     }
  //   }
  // })

  // return li
}

function createTagTree(tag, depth = 1, forceShowButton = false, hidden = false, isReview = false) {
  if (forceShowButton) {
    tag.thisTag.showedChildren = false
  }

  let li = document.createElement("li")
  tag.thisTag.active = tagTreeHandler.tags.split(" ").includes(tag.thisTag.name)
  if (!isReview && (hidden || (!tag.thisTag.active && !tag.parents.some(t => t.thisTag.fetchedChildren)))) li.classList.add("hidden")

  let details = document.createElement("details")
  details.open = isReview || tag.thisTag.active
  details.setAttribute("data-tag-name", tag.thisTag.name)
  li.appendChild(details)

  let summary = document.createElement("summary")
  summary.classList.add(`${CATEGORIES[tag.thisTag.category]}-tag-category`, "tag", "px-2")
  details.appendChild(summary)

  if (isReview) {
    summary.classList.add("no-icon")

    if (!tagTreeHandler.tags.split(" ").includes(tag.thisTag.name)) {
      summary.classList.add("new-tag")
    } else {
      summary.classList.add("is-review-existing-tag")
    }
  } else {
    if (tagTreeHandler.unchangedTags.split(" ").includes(tag.thisTag.name) && !details.open) {
      summary.classList.add("removed-tag")
    }

    if (!tagTreeHandler.unchangedTags.split(" ").includes(tag.thisTag.name) && details.open) {
      summary.classList.add("new-tag")
    }
  }

  let handle = (e) => {
    e.preventDefault()
    hotkeys.setScope("tagging")

    details.open = !details.open

    tag.thisTag.active = details.open

    if (!tag.thisTag.active) {
      for (let child of details.querySelectorAll(":scope > ul > li > details[open]")) {
        child.firstChild.click()
      }

      for (let child of details.querySelectorAll(".has-active-children")) {
        child.classList.remove("has-active-children")
      }

      if (!tagTreeHandler.preventClicks) {
        tagTreeHandler.tags = removeFromText(tagTreeHandler.tags, tag.thisTag.name).trim()
        updateTagCount()

        for (let duplicateDetails of document.querySelectorAll(`.tree.mb-3.duplicate-added-tag > li > details[data-tag-name=\"${tag.thisTag.name}\"]`)) {
          duplicateDetails.parentElement.parentElement.remove()
        }
      }

      if (!tagTreeHandler.unchangedTags.split(" ").includes(tag.thisTag.name)) {
        summary.classList.remove("new-tag")
      } else {
        summary.classList.add("removed-tag")
      }

      // if (li.parentElement.parentElement?.firstChild?.classList?.contains("added-via-implication")) {
      //   if (li.parentElement.parentElement.querySelectorAll(":scope > ul > li > details[open]").length == 0) {
      //     li.parentElement.parentElement.firstChild.click()
      //     let tagName = li.parentElement.parentElement.getAttribute("data-tag-name")

      //     for (let [topLevelTagName, structure] of Object.entries(tagTreeHandler.currentStructure)) {
      //       if (tagName == topLevelTagName) {
      //         tagTreeHandler.currentStructure[topLevelTagName].thisTag.active = false
      //         break
      //       } else {
      //         let s = findChildInStructure({ [tagName]: structure }, tagName)
      //         if (s) {
      //           s.thisTag.active = false
      //         }
      //       }
      //     }

      //     tagTreeHandler.tags = removeFromText(tagTreeHandler.tags, tagName).trim()
      //     li.parentElement.parentElement.parentElement.parentElement.remove()
      //   }
      // }
    } else {
      summary.classList.remove("removed-tag")
      if (!tagTreeHandler.preventClicks) {
        tagTreeHandler.tags = addToText(tagTreeHandler.tags, tag.thisTag.name).trim()
        updateTagCount()

        if (!tagTreeHandler.unchangedTags.split(" ").includes(tag.thisTag.name)) {
          addNewTag(tag.thisTag.name, false, false, false)
        }
      }

      if (!tagTreeHandler.unchangedTags.split(" ").includes(tag.thisTag.name)) {
        summary.classList.add("new-tag")
      }
    }

    if (!tagTreeHandler.preventClicks) {
      tagTreeHandler.preventClicks = true

      if (!tag.thisTag.active) {
        let existing = document.querySelectorAll(`.tree.mb-3.added-tag > li > details[data-tag-name=\"${tag.thisTag.name}\"]`)

        for (let e of existing) e.parentElement.parentElement.remove()
      }

      let allOfTheSame = document.querySelectorAll(`[data-tag-name=\"${tag.thisTag.name}\"]`)

      for (let child of allOfTheSame) {
        if (child == details) continue

        let anyActive = details.open || child.parentElement.parentElement.querySelectorAll(`:scope > li > details[open]`).length - 1 > 0

        child.firstChild.click()

        if (child.parentElement.parentElement.parentElement) {
          if (anyActive) {
            for (let c of child.parentElement.parentElement.parentElement.querySelectorAll(":scope > .show-implications-button")) {
              c.classList.add("has-active-children")
            }
          } else {
            for (let c of child.parentElement.parentElement.parentElement.querySelectorAll(":scope > .show-implications-button")) {
              c.classList.remove("has-active-children")
            }
          }
        }
      }

      tagTreeHandler.preventClicks = false
    }
  }

  summary.addEventListener("mousedown", (e) => {
    if (e.button == 1) {
      e.stopImmediatePropagation()
      window.open(`https://e621.net/posts?tags=${tag.thisTag.name}`)
    }
  })

  if (!isReview) {
    summary.addEventListener("click", handle)
  }

  let p = document.createElement("p")
  p.innerText = toTitle(tag.thisTag.name)

  if (tag.thisTag.postCount < 50) {
    let exclaim = document.createElement("span")
    exclaim.classList.add("has-text-danger")
    exclaim.innerText = "!!"
    p.appendChild(exclaim)
  }

  summary.appendChild(p)

  if (!isReview && tag.thisTag.category != 9) createImplicationRequester(details, tag.thisTag.name, depth + 1, tag)

  p.appendChild(createWikiLink(tag.thisTag.name, ["ml-1"]))

  let ul = document.createElement("ul")
  ul.classList.add("tag-tree-list-container")
  details.append(ul)

  if (tag.children.length > 0) {
    tag.children.sort(childSorter)

    for (let child of tag.children) {
      ul.appendChild(createTagTree(child, depth + 1, forceShowButton, hidden, isReview))
    }
  }

  // if (!isReview) {
  //   li.addEventListener("click", (e) => {
  //     e.preventDefault()
  //     e.stopImmediatePropagation()

  //     hotkeys.setScope("tagging")

  //     if (details.open) {
  //       let collapse = details.querySelector(".hide-implications-button")
  //       if (collapse) {
  //         collapse.click()
  //       }
  //     }
  //   })
  // }

  return li
}

let tagTreeHandler = {
  currentStructure: {},
  tags: "",
  unchangedTags: "",
  lastChanges: [],
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
    updateTagCount()
    tagTreeHandler.unchangedTags = slide.tags

    await getImplications(tagTreeHandler.tags, allImplications)

    if (slideshowController.currentSlideNumber == index) {
      let structure = await resolveTagStructure(allImplications, tagTreeHandler.tags)

      tagTreeHandler.currentStructure = structure

      let asArray = Object.values(structure)

      asArray.sort(childSorter)

      for (let group of asArray) {
        let ul = document.createElement("ul")
        ul.classList.add("tree", "mb-3")
        uiElements.tagContainer.appendChild(ul)

        ul.appendChild(createTagTree(group, 1, true))
      }
    }
  }
}

function unwind(current, child, active = true, newGroup = {}, addedTags = []) {
  addedTags.push(current.thisTag.name)
  if (active) current.thisTag.active = true
  else current.thisTag.active = tagTreeHandler.tags.split(" ").includes(current.thisTag.name)
  current.thisTag.fetchedChildren = false
  current.thisTag.showedChildren = false

  if (!current.children) current.children = []
  if (child) current.children.push(child)

  current.children.sort(childSorter)

  if (current.parents.length > 0) {
    for (let parent of current.parents) {
      unwind(parent, current, active, newGroup, addedTags)[0]
    }
  } else {
    if (newGroup[current.thisTag.name]) {
      deepMergeChildren(newGroup[current.thisTag.name], {
        thisTag: current.thisTag,
        parents: [],
        children: current.children
      }, !active)
    } else {
      newGroup[current.thisTag.name] = {
        thisTag: current.thisTag,
        parents: [],
        children: current.children
      }
    }
  }

  return [newGroup, addedTags]
}

function deepMergeChildren(structure, withStructure, isReview = false) {
  for (let child of withStructure.children) {
    let existing = structure.children.find(t => t.thisTag.name == child.thisTag.name)
    if (existing) {
      if (!isReview) existing.thisTag.active = true
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
    if (tag.trim() == "") continue

    if (tagsBefore.includes(tag)) {
      changes.push({ tag, change: 0 })
    } else {
      changes.push({ tag, change: 1 })
    }
  }

  for (let tag of tagsBefore) {
    if (tag.trim() == "") continue

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

async function addNewTag(tag, replaceExistingTopLevel = true, flash = true, checkExisting = false) {
  tag = tag.trim().replaceAll(" ", "_")
  e621AutoComplete.next = null
  uiElements.newTagInput.value = ""
  if (tag == "") return

  uiElements.autoCompleteContainer.classList.remove("is-active")

  if (checkExisting) {
    for (let [tagName, structure] of Object.entries(tagTreeHandler.currentStructure)) {
      let existing = findChildInStructure({ [tagName]: structure }, tag.trim())

      if (existing && existing.thisTag.active) {
        if (flash) {
          for (let i = 0; i < 6; i++) {
            uiElements.newTagInput.classList.toggle("has-background-grey")
            await wait(150)
          }
        }

        return
      }
    }
  }

  tagTreeHandler.preventScroll = false

  let allImplications = {}
  await getImplications(tag.trim(), allImplications, "allparents")

  tag = Object.keys(allImplications)[0]

  let t = Object.values(allImplications)[0]
  let structure, addedTags
  if (Object.keys(t).length > 0) {
    [structure, addedTags] = unwind(t)
  } else {
    structure = {
      [tag.trim()]: {
        children: [],
        parents: [],
        thisTag: { id: -1, name: tag.trim(), category: 9, active: true, fetchedChildren: true, showedChildren: true }
      }
    }

    addedTags = [tag.trim()]
  }

  for (let tag of addedTags) {
    tagTreeHandler.tags = addToText(tagTreeHandler.tags, tag).trim()
    updateTagCount()
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

    let allTags = document.querySelectorAll(`[data-tag-name=\"${updatedKey}\"]`)

    if (allTags.length > 0) {
      if (replaceExistingTopLevel) {
        for (let child of allTags) {
          let li = child.parentElement
          let parent = li.parentElement

          let open = child.open

          li.remove()

          let newLi = createTagTree(struct, 1, true, !open)

          newLi.classList.remove("hidden")

          parent.appendChild(newLi)

          if (!open) {
            for (let c of parent.firstChild.firstChild.querySelectorAll(":scope > .show-implications-button")) {
              c.classList.add("has-active-children")
            }
          }
        }
      }
    } else {
      let next = orderedKeys.indexOf(updatedKey) + 1

      if (next >= orderedKeys.length) {
        let topLevelAfter = document.querySelector(`.tree > li > [data-tag-name=\"${orderedKeys[orderedKeys.length - 2]}\"]`)?.parentElement?.parentElement?.nextElementSibling

        let ul = document.createElement("ul")
        ul.classList.add("tree", "mb-3", "added-tag")
        uiElements.tagContainer.insertBefore(ul, topLevelAfter)

        let newLi = createTagTree(struct, 1, true, true)

        if (newLi.firstChild.lastChild.children.length > 0) {
          for (let c of newLi.querySelectorAll(":scope > details > .show-implications-button")) {
            c.classList.add("has-active-children")
          }
        }

        newLi.classList.remove("hidden")

        ul.appendChild(newLi)

        if (!tagTreeHandler.unchangedTags.split(" ").includes(tag.trim())) ul.firstChild.firstChild.firstChild.classList.add("new-tag")
      } else {
        let topLevelAfter = document.querySelector(`.tree > li > [data-tag-name=\"${orderedKeys[next]}\"]`)

        let ul = document.createElement("ul")
        ul.classList.add("tree", "mb-3", "added-tag")
        uiElements.tagContainer.insertBefore(ul, topLevelAfter?.parentElement?.parentElement)

        let newLi = createTagTree(struct, 1, true, true)

        if (newLi.firstChild.lastChild.children.length > 0) {
          for (let c of newLi.querySelectorAll(":scope > details > .show-implications-button")) {
            c.classList.add("has-active-children")
          }
        }

        newLi.classList.remove("hidden")

        ul.appendChild(newLi)

        if (!tagTreeHandler.unchangedTags.split(" ").includes(tag)) ul.firstChild.firstChild.firstChild.classList.add("new-tag")
      }
    }
  }

  let struct = findChildInStructure(tagTreeHandler.currentStructure, tag)

  let existing = document.querySelector(`.tree.mb-3.duplicate-added-tag > li > details[data-tag-name=\"${tag}\"]`)

  let after = null

  if (existing) {
    after = existing.parentElement.parentElement.nextSibling
    existing.parentElement.parentElement.remove()
  }

  let ul = document.createElement("ul")
  ul.classList.add("tree", "mb-3", "added-tag", "duplicate-added-tag")
  uiElements.tagContainer.insertBefore(ul, after)

  let newLi = createTagTree(struct, 1, true, true)

  newLi.classList.remove("hidden")

  ul.appendChild(newLi)

  if (!tagTreeHandler.unchangedTags.split(" ").includes(tag)) ul.firstChild.firstChild.firstChild.classList.add("new-tag")

  // ul.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" })

  tagTreeHandler.preventClicks = true

  for (let addedTag of addedTags) {
    let allTags = document.querySelectorAll(`[data-tag-name=\"${addedTag}\"]`)

    for (let child of allTags) {
      if (!child.open) {
        child.firstChild.click()
        child.open = true
      }

      if (!tagTreeHandler.unchangedTags.split(" ").includes(addedTag)) {
        child.firstChild.classList.add("new-tag")

        // if (tag != addedTag) {
        //   child.firstChild.classList.add("added-via-implication")
        // }
      }
    }
  }

  tagTreeHandler.preventClicks = false

  if (flash) {
    for (let i = 0; i < 6; i++) {
      uiElements.newTagInput.classList.toggle("has-background-success")
      await wait(150)
    }
  }
}

async function redoLastChanges(changes) {
  if (!changes) return

  for (let change of changes) {
    if (change.change == 1) {
      await addNewTag(change.tag, true, false, true)
    } else {
      if (tagTreeHandler.tags.split(" ").includes(change.tag)) {
        tagTreeHandler.tags = removeFromText(tagTreeHandler.tags, change.tag).trim()
        updateTagCount()
        let anyOne = document.querySelector(`[data-tag-name=\"${change.tag}\"]`)
        if (anyOne) anyOne.firstChild.click()
      }
    }
  }

  uiElements.closeRedoButton.click()
}

uiElements.addTagButton.addEventListener("click", async () => {
  addNewTag(uiElements.newTagInput.value, true, true, true)
})

uiElements.newTagInput.addEventListener("keypress", (e) => {
  if (e.key == "Enter") {
    addNewTag(uiElements.newTagInput.value, true, true, true)
  }
})

function updateAutocompleteDropdown() {
  let item = uiElements.autoCompleteMenu.children.item(currentAutocompleteItem)

  for (let child of uiElements.autoCompleteMenu.children) {
    child.classList.remove("active")
  }

  if (item) item.classList.add("active")
}

let currentAutocompleteItem = -1

uiElements.searchText.addEventListener("focus", () => {
  hotkeys.setScope("searching")
})

uiElements.newTagInput.addEventListener("focus", () => {
  currentAutocompleteItem = -1
  updateAutocompleteDropdown()
  hotkeys.setScope("addingnewtag")
})

uiElements.newTagInput.addEventListener("focusout", () => {
  currentAutocompleteItem = -1
  updateAutocompleteDropdown()
  hotkeys.setScope("tagging")
})

function createWikiLink(tagName, classes) {
  let a = document.createElement("a")
  a.classList.add(...classes)
  a.classList.add("has-tooltip-arrow", "has-tooltip-multiline", "has-tooltip-bottom")
  a.style.cursor = "help"
  a.innerText = "?"
  a.target = "_blank"
  a.href = `https://e621.net/wiki_pages/show_or_new?title=${encodeURIComponent(tagName)}`

  a.addEventListener("mousedown", (e) => {
    e.stopImmediatePropagation()
  })

  a.addEventListener("click", (e) => {
    e.stopImmediatePropagation()
  })

  // a.addEventListener("mouseover", async (e) => {
  //   if (!a.getAttribute("data-tooltip")) {
  //     let shortWiki = await e621WikiFetcher.fetchShortWiki(tagName)

  //     a.setAttribute("data-tooltip", shortWiki)
  //   }
  // })

  // a.addEventListener("mouseover", (e) => {
  //   console.log(e)
  // })

  return a
}

uiElements.newTagInput.addEventListener("input", async (e) => {
  hotkeys.setScope("addingnewtag")
  currentAutocompleteItem = -1
  let tag = uiElements.newTagInput.value.trim().replaceAll(" ", "_")
  if (uiElements.newTagInput.value.length >= 3) {
    try {
      let autoComplete = await e621AutoComplete.autoComplete(tag)
      if (uiElements.newTagInput.value.length < 3) return // Async hell
      uiElements.autoCompleteContainer.classList.add("is-active")

      while (uiElements.autoCompleteMenu.firstChild) {
        uiElements.autoCompleteMenu.removeChild(uiElements.autoCompleteMenu.firstChild)
      }

      for (let i = 0; i < autoComplete.length; i++) {
        let completion = autoComplete[i]
        let a = document.createElement("button")
        a.classList.add("dropdown-item")
        if (i != autoComplete.length - 1) a.classList.add("mb-1")
        a.style.cursor = "pointer"
        a.style.border = "1px solid black"


        if (!completion.antecedent_name) {
          let span = document.createElement("span")
          span.classList.add(`${CATEGORIES[completion.category]}-tag-color`)
          a.appendChild(span)
          span.innerText = completion.name

          span.appendChild(createWikiLink(completion.name, ["is-underlined", "ml-1"]))
        } else {
          let span = document.createElement("span")
          span.classList.add(`${CATEGORIES[completion.category]}-tag-color`)
          a.appendChild(span)
          span.innerText = `${completion.antecedent_name}`

          span.appendChild(createWikiLink(completion.name, ["is-underlined", "ml-1", "mr-1"]))

          let span2 = document.createElement("span")
          span2.classList.add("has-text-light")
          a.appendChild(span2)
          span2.innerHTML = `&rarr;`

          let span3 = document.createElement("span")
          span3.classList.add(`${CATEGORIES[completion.category]}-tag-color`)
          a.appendChild(span3)
          span3.innerText = ` ${completion.name}`

          span3.appendChild(createWikiLink(completion.name, ["is-underlined", "ml-1"]))
        }

        let span = document.createElement("span")
        span.classList.add("has-text-light")
        span.innerText = ` (${completion.post_count})`
        a.appendChild(span)

        a.addEventListener("mousedown", (e) => {
          e.preventDefault()

          if (e.button == 1) window.open(`https://e621.net/posts?tags=${completion.name}`)
        })

        a.addEventListener("click", (e) => {
          e.preventDefault()

          if (e.button == 0) addNewTag(completion.name, true, true, true)
        })

        a.addEventListener("mouseover", (e) => {
          currentAutocompleteItem = Array.from(uiElements.autoCompleteMenu.children).findIndex(x => x == a)
          updateAutocompleteDropdown()
        })

        uiElements.autoCompleteMenu.appendChild(a)
      }
    } catch (e) {
      console.error(e)
      uiElements.autoCompleteContainer.classList.remove("is-active")
    }
  } else {
    uiElements.autoCompleteContainer.classList.remove("is-active")
  }

  updateAutocompleteDropdown()
})

uiElements.submitChangesButton.addEventListener("click", () => {
  hotkeys.setScope("review")
  uiElements.reviewChangesModal.classList.add("is-active")

  while (uiElements.tagChangesReview.firstChild) {
    uiElements.tagChangesReview.removeChild(uiElements.tagChangesReview.firstChild)
  }

  let changes = getChanges()

  let createSpan = (change) => {
    let span = document.createElement("span")
    if (change.change == 0) span.classList.add("has-text-grey-lighter")
    else if (change.change == 1) span.classList.add("has-text-success")
    else if (change.change == -1) span.classList.add("has-text-danger")
    span.innerText = `${change.change == 0 ? "" : (change.change == -1 ? "-" : "+")}${change.tag} `

    let child = findChildInStructure(tagTreeHandler.currentStructure, change.tag)

    if (child && (child.thisTag.category == 9 || child.thisTag.postCount < 50)) {
      span.innerText = span.innerText.trim()
      let exclaim = document.createElement("sup")
      exclaim.classList.add("has-text-warning")
      exclaim.innerText = "!! "
      span.appendChild(exclaim)
    }

    return span
  }

  for (let change of changes) {
    uiElements.tagChangesReview.appendChild(createSpan(change))
  }

  uiElements.tagChangesReview.style.height = `${uiElements.tagContainer.clientHeight / 1.5}px`
})

uiElements.confirmSubmitButton.addEventListener("click", async () => {
  // showGeneralScreen("Submitting changes is currently disabled.")
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

  hotkeys.setScope("review")

  let changes = getChanges().filter(t => t.change != 0)

  let tagDiff = changes.map(t => t.change == -1 ? `-${t.tag}` : t.tag).join(" ").trim()

  if (tagDiff.length == 0) return

  let slide = slideshowController.getCurrentSlide()

  tagTreeHandler.lastChanges.unshift({ img: slide.fileUrl, changes })

  if (!slide.wasUploaded) {
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
        showFailureScreen(`Failure (${res.status})`, "You've probably hit the maximum post changes per hour limit. Take a break.")
      }
    } catch (e) {
      console.error(e)

      showFailureScreen("Failure", "Unknown error, please check console")
    }
  } else {
    let formData = new FormData()

    let splitTags = tagTreeHandler.tags.split(" ")

    if (!slide.bypassGender && !["male", "female", "andromorph", "gynomorph", "herm", "maleherm", "intersex"].some(t => splitTags.includes(t))) {
      showGeneralScreen("Your post lacks any obvious gender tags. Submit again without any changes to force.")
      slide.bypassGender = true
      return
    }

    if (!slide.bypassCount && !["solo", "duo", "trio", "group", "zero_pictured"].some(t => splitTags.includes(t))) {
      showGeneralScreen("Your post lacks any obvious character count tags. Submit again without any changes to force.")
      slide.bypassCount = true
      return
    }

    if (!slide.bypassCharacterInteractions && !["solo", "zero_pictured", "male/male", "male/female", "female/female", "intersex/male", "intersex/female", "intersex/intersex"].some(t => splitTags.includes(t))) {
      showGeneralScreen("Your post lacks any obvious character interaction tags and is not tagged as solo or zero_pictured. Submit again without any changes to force.")
      slide.bypassCharacterInteractions = true
      return
    }

    if (!slide.bypassForms && !["anthro", "feral", "humanoid", "human", "taur", "semi-anthro"].some(t => splitTags.includes(t))) {
      showGeneralScreen("Your post lacks any obvious character form tags. Submit again without any changes to force.")
      slide.bypassForms = true
      return
    }

    let ratingIndex = splitTags.findIndex(t => t.startsWith("rating:"))

    if (ratingIndex == -1) {
      showFailureScreen(`No rating`, "You have to provide a rating in the form of rating:e, rating:q, or rating:s as a tag.")
      return
    }

    let rating = splitTags.splice(ratingIndex, 1)[0].slice(7)

    tagTreeHandler.tags = splitTags.join(" ")

    if (!["s", "q", "e"].includes(rating)) {
      showFailureScreen(`No rating`, "You have to provide a rating in the form of rating:e, rating:q, or rating:s as a tag.")
      return
    }

    let sources = Array.from(uiElements.sourceContainer.querySelectorAll("input")).map(e => e.value).filter(s => s)

    if (sources.length == 0) {
      showFailureScreen(`No source`, "You must provide at least one source")
      return
    }

    formData.append("upload[tag_string]", tagTreeHandler.tags)
    if (!slide.isURLUpload) formData.append("upload[file]", slide.fileForForm)
    else formData.append("upload[direct_url]", slide.urlForForm)
    formData.append("upload[source]", sources.join("%0A"))
    formData.append("upload[rating]", rating)

    showLoadingScreen()

    try {
      let res = await fetch(`https://e621.net/uploads.json`, {
        method: "POST",
        headers: {
          "User-Agent": "Yiff.Today VisualTagger (by DefinitelyNotAFurry4)",
          Authorization: `Basic ${btoa(`${login.e621Username}:${login.e621ApiKey}`)}`
        },
        body: formData
      })

      if (res.ok) {
        showSuccessScreen()
      } else {
        showFailureScreen(`Failure (${res.status})`, `${(await res.json()).reason.toUpperCase()}`)
      }
    } catch (e) {
      showFailureScreen(`Failure`, `Check console`)
      console.error(e)
    }
  }

  tagTreeHandler.unchangedTags = tagTreeHandler.tags

  tagTreeHandler.lock = false
})

function closeAllModals() {
  hotkeys.setScope("tagging")

  uiElements.responseModal.classList.remove("is-active")
  uiElements.reviewChangesModal.classList.remove("is-active")
  uiElements.reviewAddTagModal.classList.remove("is-active")
}

function showGeneralScreen(text) {
  hotkeys.setScope("review")

  uiElements.responseTitle.innerText = text

  uiElements.responseModal.classList.add("is-active")
  uiElements.closeResponseButton.classList.remove("hidden")
}

function showLoadingScreen() {
  hotkeys.setScope("review")

  uiElements.responseTitle.innerText = "Loading"

  uiElements.responseModal.classList.add("is-active")
  uiElements.closeResponseButton.classList.add("hidden")
}

function showSuccessScreen() {
  hotkeys.setScope("review")

  while (uiElements.responseContent.firstChild) {
    uiElements.responseContent.removeChild(uiElements.responseContent.firstChild)
  }

  uiElements.responseTitle.innerText = "Success"

  uiElements.responseModal.classList.add("is-active")

  uiElements.closeResponseButton.classList.remove("hidden")
}

function showFailureScreen(title, status) {
  hotkeys.setScope("review")

  while (uiElements.responseContent.firstChild) {
    uiElements.responseContent.removeChild(uiElements.responseContent.firstChild)
  }

  uiElements.responseTitle.innerText = title

  let span = document.createElement("span")
  span.innerText = status

  uiElements.responseContent.appendChild(span)

  uiElements.responseModal.classList.add("is-active")

  uiElements.closeResponseButton.classList.remove("hidden")
}

function updateTagCount() {
  let slide = slideshowController.getCurrentSlide()

  if (slide.wasUploaded) {
    slide.bypassCharacterInteractions = false
    slide.bypassCount = false
    slide.bypassForms = false
    slide.bypassGender = false
  }

  let face = document.getElementById("face")
  let tagCountText = document.getElementById("tag-count-text")

  let tagCount = tagTreeHandler.tags.split(" ").filter(a => a).length

  if (tagCount < 15) {
    face.className = "fa-regular fa-face-frown"
    face.classList.add("fa-face-frown")
  } else if (tagCount < 25) {
    face.className = "fa-regular fa-face-meh"
    face.classList.add("fa-face-meh")
  } else if (tagCount < 40) {
    face.className = "fa-regular fa-face-smile"
  } else if (tagCount < 60) {
    face.className = "fa-regular fa-face-surprise"
  } else {
    face.className = "fa-regular fa-face-surprise fa-bounce"
  }

  tagCountText.innerText = `${tagCount} tags`
}

uiElements.closeReviewButton.addEventListener("click", () => {
  hotkeys.setScope("tagging")
  uiElements.reviewChangesModal.classList.remove("is-active")
})

uiElements.closeResponseButton.addEventListener("click", () => {
  hotkeys.setScope("tagging")
  uiElements.responseModal.classList.remove("is-active")
})

uiElements.closeReviewAddTagButton.addEventListener("click", () => {
  hotkeys.setScope("tagging")
  uiElements.reviewAddTagModal.classList.remove("is-active")
})

uiElements.closeRedoButton.addEventListener("click", () => {
  hotkeys.setScope("tagging")
  uiElements.redoModal.classList.remove("is-active")
})

uiElements.reviewTagAddButton.addEventListener("click", () => {
  hotkeys.setScope("tagging")
  uiElements.reviewAddTagModal.classList.remove("is-active")
  addNewTag(tagTreeHandler.reviewingTag, true, true, true)
})

uiElements.copyTagsButton.addEventListener("click", (e) => {
  hotkeys.setScope("tagging")
  navigator.clipboard.writeText(tagTreeHandler.tags)
})

uiElements.copyTagsButton.addEventListener("contextmenu", async (e) => {
  hotkeys.setScope("tagging")
  e.preventDefault()

  let tags = (await navigator.clipboard.readText()).split(" ")

  showLoadingScreen()

  let p = []

  for (let tag of tags) {
    p.push(addNewTag(tag, true, false, true))
  }

  await Promise.all(p)

  showSuccessScreen()
})

uiElements.showCurrentButton.addEventListener("click", () => {
  hotkeys.setScope("tagging")

  // for (let c of document.querySelectorAll(`.new-tag`)) {
  //   c.classList.remove("new-tag")
  // }

  tagTreeHandler.preventScroll = true
  uiElements.collapseAllButton.click()
  tagTreeHandler.preventScroll = false

  for (let ul of document.querySelectorAll("ul.hidden")) {
    ul.classList.remove("hidden")
  }

  for (let details of document.querySelectorAll(".hidden > details[open]")) {
    details.parentElement.classList.remove("hidden")
  }

  for (let active of document.querySelectorAll(".has-active-children")) {
    active.classList.remove("has-active-children")
  }
})

uiElements.showChangedButton.addEventListener("click", () => {
  hotkeys.setScope("tagging")

  uiElements.showCurrentButton.click()

  tagTreeHandler.preventScroll = true
  tagTreeHandler.preventNewRequests = true

  let newChanges = getChanges().filter(t => t.change == 1)

  let toHide = Array.from(document.querySelectorAll(`.tree.mb-3 > li > [data-tag-name]`)).map(c => c.getAttribute("data-tag-name"))

  for (let [tagName, structure] of Object.entries(tagTreeHandler.currentStructure)) {
    for (let newTag of newChanges) {
      if (newTag.tag != tagName) {
        let existing = findChildInStructure({ [tagName]: structure }, newTag.tag)

        if (existing) {
          let index = toHide.indexOf(tagName)
          while (index != -1) {
            toHide.splice(index, 1)
            index = toHide.indexOf(tagName)
          }
        }
      } else {
        let index = toHide.indexOf(tagName)
        while (index != -1) {
          toHide.splice(index, 1)
          index = toHide.indexOf(tagName)
        }
      }
    }
  }

  for (let tagName of toHide) {
    for (let details of document.querySelectorAll(`.tree > li > [data-tag-name=\"${tagName}\"]`)) {
      details.parentElement.parentElement.classList.add("hidden")
    }
  }

  for (let ul of document.querySelectorAll(`.tree.duplicate-added-tag`)) {
    ul.classList.add("hidden")
  }

  for (let change of newChanges) {
    for (let details of document.querySelectorAll(`[data-tag-name="${change.tag}"]`)) {
      details.firstChild.classList.add("new-tag")
    }
  }

  tagTreeHandler.preventNewRequests = false
})

uiElements.showAllButton.addEventListener("click", () => {
  hotkeys.setScope("tagging")

  // for (let c of document.querySelectorAll(`.new-tag`)) {
  //   c.classList.remove("new-tag")
  // }

  tagTreeHandler.preventScroll = true
  tagTreeHandler.preventNewRequests = true

  for (let ul of document.querySelectorAll("ul.hidden")) {
    ul.classList.remove("hidden")
  }

  for (let button of document.querySelectorAll(".show-implications-button:not(.hidden)")) {
    button.click()
  }

  for (let active of document.querySelectorAll(".has-active-children")) {
    active.classList.remove("has-active-children")
  }

  tagTreeHandler.preventNewRequests = false
})

uiElements.collapseAllButton.addEventListener("click", () => {
  hotkeys.setScope("tagging")

  let noScroll = tagTreeHandler.preventScroll
  tagTreeHandler.preventScroll = true

  for (let button of document.querySelectorAll(".show-implications-button:not(.hidden)")) {
    let parent = button.parentElement
    let ul = parent.lastChild
    for (let child of ul.children) {
      child.classList.add("hidden")
    }

    // li.classList.remove("hidden")

    if (parent.querySelectorAll("details[open]").length != 0) {
      button.classList.add("has-active-children")
    }
  }

  for (let button of document.querySelectorAll(".hide-implications-button")) {
    button.click()
  }

  tagTreeHandler.preventScroll = false

  if (!noScroll) uiElements.tagContainer.scroll({ behavior: "smooth", top: 0 })
})

uiElements.reviewAddTagButton.addEventListener("click", async () => {
  let tag = uiElements.newTagInput.value.trim()
  uiElements.autoCompleteContainer.classList.remove("is-active")
  uiElements.newTagInput.value = ""
  if (tag == "") return

  tagTreeHandler.reviewingTag = tag

  tagTreeHandler.preventScroll = false

  let allImplications = {}
  await getImplications(tag, allImplications, "allparents")

  let t = Object.values(allImplications)[0]

  let [structure] = unwind(t, null, false)

  uiElements.reviewAddTagModal.classList.add("is-active")

  while (uiElements.reviewTagTreeContainer.firstChild) {
    uiElements.reviewTagTreeContainer.removeChild(uiElements.reviewTagTreeContainer.firstChild)
  }

  let asArray = Object.values(structure)

  asArray.sort(childSorter)

  for (let group of asArray) {
    let ul = document.createElement("ul")
    ul.classList.add("tree", "mb-3")
    uiElements.reviewTagTreeContainer.appendChild(ul)

    ul.appendChild(createTagTree(group, 1, true, false, true))
  }
})

hotkeys("enter", "tagging", (e) => {
  e.preventDefault()
  if (!uiElements.reviewChangesModal.classList.contains("is-active")) {
    uiElements.submitChangesButton.click()
  } /*else {
    uiElements.confirmSubmitButton.click()
  }*/
})

hotkeys("escape", "review", (e) => {
  e.preventDefault()
  if (uiElements.reviewChangesModal.classList.contains("is-active")) {
    uiElements.closeReviewButton.click()
  }

  if (uiElements.responseModal.classList.contains("is-active")) {
    uiElements.closeResponseButton.click()
  }
})

hotkeys("escape", "redoing", (e) => {
  e.preventDefault()
  if (uiElements.redoModal.classList.contains("is-active")) {
    uiElements.closeRedoButton.click()
  }
})

hotkeys("up", "addingnewtag", (e) => {
  e.preventDefault()

  currentAutocompleteItem = Math.max(-1, currentAutocompleteItem - 1)

  updateAutocompleteDropdown()
})

hotkeys("down", "addingnewtag", (e) => {
  e.preventDefault()

  currentAutocompleteItem = Math.min(uiElements.autoCompleteMenu.children.length - 1, currentAutocompleteItem + 1)

  updateAutocompleteDropdown()
})

hotkeys("enter", "addingnewtag", (e) => {
  let item = uiElements.autoCompleteMenu.children.item(currentAutocompleteItem)

  if (item) {
    e.preventDefault()
    item.click()
  }
})

hotkeys("r", "tagging", (e) => {
  hotkeys.setScope("redoing")

  while (uiElements.redoContent.firstChild) {
    uiElements.redoContent.removeChild(uiElements.redoContent.firstChild)
  }

  for (let { img, changes } of tagTreeHandler.lastChanges) {
    let i = document.createElement("img")
    i.src = img
    i.classList.add("column", "is-4")
    i.style.cursor = "pointer"

    i.addEventListener("click", (e) => {
      e.preventDefault()

      redoLastChanges(changes)
    })

    uiElements.redoContent.appendChild(i)
  }

  uiElements.redoModal.classList.add("is-active")
  // redoLastChanges()
})

hotkeys.filter = function (event) {
  let target = event.target || event.srcElement
  let tagName = target.tagName
  return !(target.isContentEditable || tagName == "SELECT" || tagName == "TEXTAREA")
}

hotkeys.setScope("tagging")

window.addEventListener("mousedown", (e) => {

  if (e.target != uiElements.tagContainer && !uiElements.tagContainer.contains(e.target)) return

  let all = document.querySelectorAll(".tag-tree-list-container")

  for (let list of all) {
    let bound = list.getBoundingClientRect()
    // - 10 for feathering + 12 for 2px border width + feathering
    if ((e.clientX >= bound.x - 10 && e.clientX <= bound.x + 12) &&
      (e.clientY >= bound.y - 10 && e.clientY <= bound.y + bound.height)) {
      let details = list.parentElement
      e.preventDefault()
      e.stopImmediatePropagation()

      hotkeys.setScope("tagging")

      if (details.open) {
        let collapse = details.querySelector(".hide-implications-button")
        if (collapse) {
          collapse.click()
        }
      }

      return
    }
  }
})

window.addEventListener("beforeunload", (e) => {
  if (getChanges().filter(c => c.change != 0).length > 0) e.preventDefault()
})

uiElements.addSourceButton.addEventListener("click", (e) => {
  if (uiElements.sourceContainer.firstElementChild.childElementCount >= 10) return
  let buttons = uiElements.sourceContainer.querySelectorAll("button")

  buttons[0].parentElement.remove()
  buttons[1].parentElement.remove()

  let cloned = uiElements.sourceContainer.firstElementChild.firstElementChild.cloneNode(true)

  cloned.firstElementChild.firstElementChild.value = ""

  uiElements.sourceContainer.firstElementChild.appendChild(cloned)

  cloned.appendChild(buttons[0].parentElement)
  cloned.appendChild(buttons[1].parentElement)
})

uiElements.removeSourceButton.addEventListener("click", (e) => {
  if (uiElements.sourceContainer.firstElementChild.childElementCount == 1) return
  let buttons = uiElements.sourceContainer.querySelectorAll("button")

  buttons[0].parentElement.remove()
  buttons[1].parentElement.remove()

  uiElements.sourceContainer.firstElementChild.lastElementChild.remove()

  uiElements.sourceContainer.firstElementChild.lastElementChild.appendChild(buttons[0].parentElement)
  uiElements.sourceContainer.firstElementChild.lastElementChild.appendChild(buttons[1].parentElement)
})