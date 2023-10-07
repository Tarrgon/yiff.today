let MEDIA_TYPE_IMAGE = "IMAGE"
let MEDIA_TYPE_GIF = "GIF"
let MEDIA_TYPE_VIDEO = "VIDEO"
let MEDIA_TYPE_UNSUPPORTED = "UNSUPPORTED"

let ENTER_KEY_ID = "Enter"
let SPACE_KEY_ID = " "
let LEFT_ARROW_KEY_ID = "ArrowLeft"
let RIGHT_ARROW_KEY_ID = "ArrowRight"
let UP_ARROW_KEY_ID = "ArrowUp"
let DOWN_ARROW_KEY_ID = "ArrowDown"
let A_KEY_ID = "a"
let D_KEY_ID = "d"
let S_KEY_ID = "s"
let W_KEY_ID = "w"
let F_KEY_ID = "f"
let L_KEY_ID = "l"
let G_KEY_ID = "g"
let E_KEY_ID = "e"
let T_KEY_ID = "t"
let ONE_KEY_ID = "1"
let TWO_KEY_ID = "2"
let THREE_KEY_ID = "3"
let NUMPAD_ENTER_KEY_ID = "NumpadEnter"
let NUMPAD_ZERO_KEY_ID = "Numpad0"
let NUMPAD_PERIOD_KEY_ID = "NumpadDecimal"
let NUMPAD_ONE_KEY_ID = "Numpad1"
let NUMPAD_TWO_KEY_ID = "Numpad2"
let NUMPAD_THREE_KEY_ID = "Numpad3"

function getMaxThumbnailsBasedOnScreenSize() {
  return 10
}

function getMediaTypeFromPath(path) {
  let fileExtension = path.substring(path.length - 4)

  switch (fileExtension.toLowerCase()) {
    case 'webm':
    case '.mp4':
      return MEDIA_TYPE_VIDEO
    case '.gif':
      return MEDIA_TYPE_GIF
    case '.zip':
    case '.swf':
      return MEDIA_TYPE_UNSUPPORTED
    default:
      return MEDIA_TYPE_IMAGE
  }
}

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms))
}