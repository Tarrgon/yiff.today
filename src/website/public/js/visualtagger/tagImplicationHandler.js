let implicationsCache = {}

let tagImplicationHandler = {
  async getTagImplications(tags, include = "children,parents") {
    let tagImplications = {}

    tags = tags.trim().split(" ")

    if (include == "children,parents") {
      for (let i = tags.length - 1; i >= 0; i--) {
        let tag = tags[i]
        if (implicationsCache[tag]) {
          tagImplications[tag] = implicationsCache[tag]
          tags.splice(i, 1)
        }
      }
    }

    if (tags.length > 0) {
      // console.log(`https://search.yiff.today/tagrelationships?tags=${tags.join("%20")}&include=${include}`)
      for (let i = 0; i < tags.length / 150; i++) {
        let theseTags = tags.slice(i * 150, i * 150 + 150)

        let res = await fetch(`https://search.yiff.today/tagrelationships?tags=${theseTags.map(t => encodeURIComponent(t)).join("%20")}&include=${include}`)

        if (res.ok) {
          for (let [tagName, implications] of Object.entries(await res.json())) {
            tagImplications[tagName] = implications

            if (!implicationsCache[tagName]) implicationsCache[tagName] = implications
          }
        }
      }
    }

    return tagImplications
  }
}