async function count() {
  document.getElementById("count").innerText = ""
  document.getElementById("count").classList.add("loading-ellipsis")
  let res = await fetch("https://search.yiff.today/count", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: document.getElementById("search-text").value
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

document.getElementById("count-button").addEventListener("click", count)

document.addEventListener("keypress", (ev) => {
  if (ev.key == "Enter") {
    count()
  }
})