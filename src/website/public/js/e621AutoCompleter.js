let e621AutoComplete = {
  next: null,
  current: null,
  processQueue: async () => {
    let current = e621AutoComplete.current = e621AutoComplete.next
    e621AutoComplete.next = null
    let res = await fetch(`https://e621.net/tags/autocomplete.json?search%5Bname_matches%5D=${current.query}&expiry=7`)

    if (res.ok) {
      current.resolve(await res.json())
    } else {
      current.reject(res)
    }

    await wait(10)
    e621AutoComplete.current = null
    if (e621AutoComplete.next) e621AutoComplete.processQueue()
  },

  autoComplete: (query) => {
    return new Promise((resolve, reject) => {
      e621AutoComplete.next = { query, resolve, reject }
      if (e621AutoComplete.current == null) e621AutoComplete.processQueue()
    })
  }
}