function updateSize() {
  let image1 = document.getElementById("img-1")
  let image2 = document.getElementById("img-2")

  image1.style.width = null
  image1.style.height = null

  image2.style.width = null
  image2.style.height = null

  let viewWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth
  let viewHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight


  let newWidth = image1.width < image2.width ? image1.width : image2.width
  let newHeight = image1.height < image2.height ? image1.height : image2.height

  let viewRatio = viewWidth / viewHeight
  let newRatio = newWidth / newHeight

  if (newRatio > viewRatio) {
    newWidth = viewWidth
    newHeight = viewWidth / newRatio
  } else {
    newWidth = viewHeight * newRatio
    newHeight = viewHeight
  }

  image1.style.width = newWidth + "px"
  image1.style.height = (newHeight - 100) + "px"

  image2.style.width = newWidth + "px"
  image2.style.height = (newHeight - 100) + "px"
}

function getExif(img) {
  return new Promise((resolve) => {
    EXIF.getData(img, function () {
      resolve(EXIF.getAllTags(this))
    })
  })
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function urlToBlob(url) {
  let image = await fetch(url.startsWith("blob") ? url : "https://corsproxy.io/?" + encodeURIComponent(url))
  return await image.blob()
}

async function urlToBuffer(url) {
  let image = await fetch(url.startsWith("blob") ? url : "https://corsproxy.io/?" + encodeURIComponent(url))
  return await image.arrayBuffer()
}

function setMetadata(data) {
  for (let [id, value] of Object.entries(data)) {
    document.getElementById(id).innerText = value
  }
}

function humanFileSize(bytes, si=false, dp=1) {
  const thresh = si ? 1000 : 1024

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B'
  }

  const units = si 
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] 
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
  let u = -1
  const r = 10**dp

  do {
    bytes /= thresh
    ++u
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1)


  return bytes.toFixed(dp) + ' ' + units[u]
}

async function updateMetadata() {
  let img1 = document.getElementById("img-1")
  let img2 = document.getElementById("img-2")

  while (!img1.complete || !img2.complete) await wait(100)

  let blob1 = await urlToBlob(img1.src)
  let blob2 = await urlToBlob(img2.src)

  let tags1 = await ExifReader.load(await urlToBuffer(img1.src))
  let tags2 = await ExifReader.load(await urlToBuffer(img2.src))

  if (tags1["FileType"].value == "jpeg") {
    setMetadata({
      "img-1-size": `Size: ${tags1["Image Width"].value}x${tags1["Image Height"].value} (${humanFileSize(blob1.size, true)})`,
      "img-1-type": `File type: ${tags1["FileType"].description}`,
      "img-1-bps": `Bits per sample: ${tags1["Bits Per Sample"].value}`,
      "img-1-color-components": `Color components: ${tags1["Color Components"].value}`,
      "img-1-subsampling": `Subsampling: ${tags1["Subsampling"].description}`
    })
  } else if (tags1["FileType"].value == "png") {
    setMetadata({
      "img-1-size": `Size: ${tags1["Image Width"].value}x${tags1["Image Height"].value} (${humanFileSize(blob1.size, true)})`,
      "img-1-type": `File type: ${tags1["FileType"].description}`,
      "img-1-bps": `Bit depth: ${tags1["Bit Depth"].value}`,
      "img-1-color-components": `Color Type: ${tags1["Color Type"].description}`,
      "img-1-subsampling": ""
    })
  } else if (tags1["FileType"].value == "gif") {
    setMetadata({
      "img-1-size": `Size: ${tags1["Image Width"].value}x${tags1["Image Height"].value} (${humanFileSize(blob1.size, true)})`,
      "img-1-type": `File type: ${tags1["FileType"].description}`,
      "img-1-bps": `Color resolution depth: ${tags1["Color Resolution Depth"].description}`,
      "img-1-color-components": "",
      "img-1-subsampling": ""
    })
  }

  if (tags2["FileType"].value == "jpeg") {
    setMetadata({
      "img-2-size": `Size: ${tags2["Image Width"].value}x${tags2["Image Height"].value} (${humanFileSize(blob2.size, true)})`,
      "img-2-type": `File type: ${tags2["FileType"].description}`,
      "img-2-bps": `Bits per sample: ${tags2["Bits Per Sample"].value}`,
      "img-2-color-components": `Color components: ${tags2["Color Components"].value}`,
      "img-2-subsampling": `Subsampling: ${tags2["Subsampling"].description}`
    })
  } else if (tags2["FileType"].value == "png") {
    setMetadata({
      "img-2-size": `Size: ${tags2["Image Width"].value}x${tags2["Image Height"].value} (${humanFileSize(blob2.size, true)})`,
      "img-2-type": `File type: ${tags2["FileType"].description}`,
      "img-2-bps": `Bit depth: ${tags2["Bit Depth"].value}`,
      "img-2-color-components": `Color Type: ${tags2["Color Type"].description}`,
      "img-2-subsampling": ""
    })
  } else if (tags2["FileType"].value == "gif") {
    setMetadata({
      "img-2-size": `Size: ${tags2["Image Width"].value}x${tags2["Image Height"].value} (${humanFileSize(blob2.size, true)})`,
      "img-2-type": `File type: ${tags2["FileType"].description}`,
      "img-2-bps": `Color resolution depth: ${tags2["Color Resolution Depth"].description}`,
      "img-2-color-components": "",
      "img-2-subsampling": ""
    })
  }

  document.getElementById("metadata-container").classList.remove("hidden")
}

function compare() {
  let fileInput1 = document.getElementById("file-input-1")

  let file1 = fileInput1.files[0]

  let fileUrl1

  if (file1) {
    fileUrl1 = URL.createObjectURL(file1)
  } else {
    fileUrl1 = document.getElementById("url-input-1").value

    if (!["gif", "jpg", "jpeg", "png"].some(end => fileUrl1.endsWith(end))) return alert("File 1 type not identifiable")
  }

  if (!fileUrl1) return alert("File 1 not selected.")

  let fileInput2 = document.getElementById("file-input-1")

  let file2 = fileInput2.files[0]

  let fileUrl2

  if (file2) {
    fileUrl2 = URL.createObjectURL(file2)
  } else {
    fileUrl2 = document.getElementById("url-input-2").value

    if (!["gif", "jpg", "jpeg", "png"].some(end => fileUrl2.endsWith(end))) return alert("File 2 type not identifiable.")
  }

  if (!fileUrl2) return alert("File 2 not selected.")

  document.getElementById("img-1").src = fileUrl1
  document.getElementById("img-2").src = fileUrl2

  document.getElementById("comparison-container").classList.remove("hidden")

  updateSize()
  updateMetadata()
}