// This script is released to the public domain and may be used, modified and
// distributed without restrictions. Attribution not necessary but appreciated.
// Source: https://weeknumber.com/how-to/javascript

// Returns the ISO week of the date.
Date.prototype.getWeek = function() {
  var date = new Date(this.getTime());
  date.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year.
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  // January 4 is always in week 1.
  var week1 = new Date(date.getFullYear(), 0, 4);
  // Adjust to Thursday in week 1 and count number of weeks from date to week1.
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
                        - 3 + (week1.getDay() + 6) % 7) / 7);
}

// Returns the four-digit year corresponding to the ISO week of the date.
Date.prototype.getWeekYear = function() {
  var date = new Date(this.getTime());
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  return date.getFullYear();
}

function isDateInThisWeek(date) {
  let todayObj = new Date()
  let todayDate = todayObj.getDate()
  let todayDay = todayObj.getDay()

  let firstDayOfWeek = new Date(todayObj.setDate(todayDate - todayDay))

  let lastDayOfWeek = new Date(firstDayOfWeek)
  lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6)

  return date >= firstDayOfWeek && date <= lastDayOfWeek
}

function isSameWeek(date1, date2) {
  return date1.getFullYear() == date2.getFullYear() && date1.getWeek() == date2.getWeek()
}

function isSameDay(date1, date2) {
  let d1 = new Date(date1.getTime())
  let d2 = new Date(date2.getTime())
  return d1.setHours(0, 0, 0, 0) == d2.setHours(0, 0, 0, 0)
}

function isSameMonth(date1, date2) {
  return date1.getMonth() == date2.getMonth() && date1.getFullYear() == date2.getFullYear()
}

function getAveragePerDay(data) {
  if (!data) return 0

  let stats = {}

  for (let action of data) {
    let day = action.date.getDate()
    if (!stats[day]) stats[day] = 0
    stats[day]++
  }

  let vals = Object.values(stats)
  let avg = vals.reduce((a, c) => c + a, 0) / vals.length

  return isNaN(avg) ? 0 : avg
}

function getAveragePerWeek(data) {
  if (!data) return 0

  let stats = {}

  for (let action of data) {
    let key = `${action.date.getWeek()}-${action.date.getFullYear()}`
    if (!stats[key]) stats[key] = 0
    stats[key]++
  }

  let vals = Object.values(stats)
  let avg = vals.reduce((a, c) => c + a, 0) / vals.length

  return isNaN(avg) ? 0 : avg
}

function getAveragePerMonth(data) {
  if (!data) return 0

  let stats = {}

  for (let action of data) {
    let key = `${action.date.getMonth()}-${action.date.getFullYear()}`
    if (!stats[key]) stats[key] = 0
    stats[key]++
  }

  let vals = Object.values(stats)
  let avg = vals.reduce((a, c) => c + a, 0) / vals.length

  return isNaN(avg) ? 0 : avg
}

function convertIntoDates(data) {
  for (let action of data) {
    action.date = new Date(action.date)
  }
}

let modStats = {
  async updateStats() {
    uiElements.modStatsContainer.classList.remove("hidden")

    let res = await fetch(`/mod/stats?username=${login.e621Username}`, {
      headers: {
        Authorization: `Basic ${btoa(`${login.e621Username}:${login.e621ApiKey}`)}`
      }
    })

    if (!res.ok) return

    let data = await res.json()

    await modStats.processUpdate(data)
  },

  processUpdate(data) {
    if (data.ok) {
      let now = new Date()
      convertIntoDates(data.approvals)
      convertIntoDates(data.deletions)
      convertIntoDates(data.disapprovals)
      data = {
        approvals: {
          today: data.approvals?.filter(a => isSameDay(a.date, now)) ?? [],
          week: data.approvals?.filter(a => isSameWeek(a.date, now)) ?? [],
          month: data.approvals?.filter(a => isSameMonth(a.date, now)) ?? [],
          allTime: data.approvals ?? [],
          averageDay: getAveragePerDay(data.approvals),
          averageWeek: getAveragePerWeek(data.approvals),
          averageMonth: getAveragePerMonth(data.approvals)
        },
        deletions: {
          today: data.deletions?.filter(a => isSameDay(a.date, now)) ?? [],
          week: data.deletions?.filter(a => isSameWeek(a.date, now)) ?? [],
          month: data.deletions?.filter(a => isSameMonth(a.date, now)) ?? [],
          allTime: data.deletions ?? [],
          averageDay: getAveragePerDay(data.deletions),
          averageWeek: getAveragePerWeek(data.deletions),
          averageMonth: getAveragePerMonth(data.deletions)
        },
        disapprovals: {
          today: data.disapprovals?.filter(a => isSameDay(a.date, now)) ?? [],
          week: data.disapprovals?.filter(a => isSameWeek(a.date, now)) ?? [],
          month: data.disapprovals?.filter(a => isSameMonth(a.date, now)) ?? [],
          allTime: data.disapprovals ?? [],
          averageDay: getAveragePerDay(data.disapprovals),
          averageWeek: getAveragePerWeek(data.disapprovals),
          averageMonth: getAveragePerMonth(data.disapprovals)
        }
      }
      
      for (let [key, value] of Object.entries(data)) {
        if (key != "ok") {
          for (let [timeframe, actions] of Object.entries(value)) {
            let element = document.getElementById(`${key}-${timeframe.toLowerCase()}`)

            let prefix
            if (timeframe == "today") prefix = "Today"
            else if (timeframe == "week") prefix = "This week"
            else if (timeframe == "month") prefix = "This month"
            else if (timeframe == "allTime") prefix = "All time"
            else if (timeframe == "averageDay") prefix = "Average per day"
            else if (timeframe == "averageWeek") prefix = "Average per week"
            else if (timeframe == "averageMonth") prefix = "Average per month"

            element.innerText = `${prefix}: ${actions.length ?? (Math.floor(actions * 100) / 100)}`
          }
        }
      }
    }
  }
}