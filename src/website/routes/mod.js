const express = require("express")
const router = express.Router()

let utils

router.post("/approve", async (req, res) => {
  try {
    let r = await fetch("https://e621.net/moderator/post/approval.json", {
      method: "POST",
      body: JSON.stringify({ post_id: req.body.postId }),
      headers: {
        "User-Agent": "Yiff.Today VisualTagger (by Tarrgon)",
        "Content-Type": "application/json",
        Authorization: req.headers.authorization
      },
    })

    if (r.ok) {
      if (req.body.trackStats) {
        await utils.newApproval(req.body.modId, req.body.postId)
      }
      
      res.json(await utils.getStats(req.body.modId))
    }
    else res.status(r.status).send(await r.text())
  } catch (e) {
    res.status(400).json(JSON.stringify(e))
  }
})

router.post("/delete", async (req, res) => {
  try {
    let r = await fetch(`https://e621.net/moderator/post/posts/${req.body.postId}/delete.json`, {
      method: "POST",
      body: JSON.stringify({ commit: "Delete", reason: req.body.reason, move_favorites: true }),
      headers: {
        "User-Agent": "Yiff.Today VisualTagger (by Tarrgon)",
        "Content-Type": "application/json",
        Authorization: req.headers.authorization
      },
    })

    if (r.ok) {
      if (req.body.trackStats) {
        await utils.newDeletion(req.body.modId, req.body.postId, req.body.reason)
      }

      res.json(await utils.getStats(req.body.modId))
    }
    else res.status(r.status).send(await r.text())
  } catch (e) {
    res.status(400).json(JSON.stringify(e))
  }
})

router.post("/disapprove", async (req, res) => {
  try {
    let formData = new FormData()
    formData.append("post_disapproval[post_id]", req.body.postId)
    formData.append("post_disapproval[reason]", req.body.reason)
    let r = await fetch(`https://e621.net/moderator/post/disapprovals.json`, {
      method: "POST",
      body: formData,
      headers: {
        "User-Agent": "Yiff.Today VisualTagger (by Tarrgon)",
        Authorization: req.headers.authorization
      },
    })

    if (r.ok) {
      if (req.body.trackStats) {
        await utils.newDisapproval(req.body.modId, req.body.postId, req.body.reason)
      }

      res.json(await utils.getStats(req.body.modId))
    }
    else res.status(r.status).send(await r.text())
  } catch (e) {
    res.status(400).json(JSON.stringify(e))
  }
})

async function getE621Id(username, authorization) {
  if (!authorization) return null

  try {
    let res = await fetch(`https://e621.net/users.json?search[name_matches]=${username}&limit=1`, {
      headers: {
        Authorization: authorization
      }
    })

    if (!res.ok) return null

    let data = await res.json()

    return data[0]?.id
  } catch (e) {
    return null
  }
}

router.get("/stats", async (req, res) => {
  let stats = await utils.getStats(await getE621Id(req.query.username, req.headers.authorization))

  res.json(stats)
})

module.exports = (u) => {
  utils = u
  return router
}
