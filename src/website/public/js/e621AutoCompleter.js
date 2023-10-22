let e621AutoComplete = {
  queue: [],
  processQueue: async () => {
    let item = e621AutoComplete.queue[0]
    let res = await fetch(`https://e621.net/tags/autocomplete.json?search%5Bname_matches%5D=${item.query}&expiry=7`)

    if (res.ok) {
      item.resolve(await res.json())
    } else {
      item.reject(res)
    }

    await wait(10)
    e621AutoComplete.queue.shift()

    if (e621AutoComplete.queue.length > 0) {
      e621AutoComplete.processQueue()
    }
  },

  autoComplete: (query) => {
    return new Promise((resolve, reject) => {
      e621AutoComplete.queue.push({ query, resolve, reject })
      if (e621AutoComplete.queue.length == 1) e621AutoComplete.processQueue()
    })
  }
}