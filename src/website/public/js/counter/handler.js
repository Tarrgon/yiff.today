async function count() {
  document.getElementById("count").innerText = ""
  document.getElementById("count").classList.add("loading-ellipsis")

  let searchText = document.getElementById("search-text").value

  // searchText = await replaceAsync(searchText, new RegExp(/fav:!?([^\s]+)/g), async (match, id) => {
  //   let ids = await getFavoritesOfUser(id)

  //   if (ids.length > 0) return `( id:${ids.join(" ~ id:")} )`
  //   else return ""
  // })

  let res = await fetch("https://search.yiff.today/count", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: searchText
    })
  })

  document.getElementById("count").classList.remove("loading-ellipsis")

  if (res.ok) {
    let count = (await res.json()).count
    document.getElementById("count").innerText = count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  } else {
    console.error(await res.text())
    document.getElementById("count").innerText = `Error (${res.status}; check console for details)`
  }
}

// function wait(ms) {
//   return new Promise(r => setTimeout(r, ms))
// }

// // Thank you https://stackoverflow.com/questions/33631041/javascript-async-await-in-replace
// async function replaceAsync(str, regex, asyncFn) {
//   const promises = []
//   str.replace(regex, (match, ...args) => {
//     const promise = asyncFn(match, ...args)
//     promises.push(promise)
//   })
//   const data = await Promise.all(promises)
//   return str.replace(regex, () => data.shift())
// }

// async function getFavoritesOfUser(id) {
//   let favs = []

//   let page = 0

//   while (true) {
//     let res = await fetch(`https://e621.net/favorites.json?user_id=${id}&page=${++page}&limit=320`)

//     if (!res.ok) break

//     let f = (await res.json()).posts.map(p => p.id)

//     if (f.length == 0) break

//     favs = favs.concat(f)

//     await wait (500)
//   }

//   return favs
// }

document.getElementById("count-button").addEventListener("click", count)

document.addEventListener("keypress", (ev) => {
  if (ev.key == "Enter") {
    count()
  }
})