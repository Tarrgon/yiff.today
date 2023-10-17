let buttons = document.querySelectorAll("#color-button-container button")

for (let button of buttons) {
  button.addEventListener("click", (e) => {
    e.preventDefault()

    if (canvasController.currentColor != null) {
      fetch("/colors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ color: canvasController.currentColor, selectedName: button.id.split("-")[0] })
      })

      canvasController.deselect()
    }
  })
}