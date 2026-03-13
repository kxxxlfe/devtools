const toastMessages = {
  'open-devtools': { message: 'Open Vue devtools to see component details', type: 'normal' },
  'component-not-found': { message: 'No Vue component was found', type: 'warn' },
  'copied': { message: 'Component name copied to clipboard', type: 'normal' },
}

export function toast(id) {
  if (!Object.keys(toastMessages).includes(id)) return

  const { message, type } = toastMessages[id]

  const src = `(function() {
    __VUE_DEVTOOLS_TOAST__(\`${message}\`, '${type}');
  })()`

  chrome.devtools.inspectedWindow.eval(src, function (res, err) {
    if (err) {
      console.log(err)
    }
  })
}
