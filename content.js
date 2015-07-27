(function () {

  const ESC_KEY_CODE = 27
  const SPACE_KEY_CODE = 32
  const JACKUP_HEIGHT = 30

  if (/gyazo\.com/.test(location.hostname)) {
    document.documentElement.setAttribute('data-extension-installed', true)
  }

  function check_duplicate_capture () {
    return document.getElementsByClassName('gyazo-jackup-element').length > 0
  }

  function isPressCommandKey (event) {
    //  Return true when
    //  Press CommandKey on MacOSX or CtrlKey on Windows or Linux
    if (!(event instanceof MouseEvent || event instanceof KeyboardEvent)) {
      return false
    }
    if (navigator.platform.match(/mac/i).length > 0) {
      return event.metaKey || event.keyIdentifier === 'Meta'
    } else {
      return event.ctrlKey || event.keyIdentifier === 'Ctrl'
    }
  }

  function changeFixedElementToAbsolute () {
    Array.prototype.slice.apply(document.querySelectorAll('*')).filter(function (item) {
      return (window.window.getComputedStyle(item).position === 'fixed')
    }).forEach(function (item) {
      item.classList.add('gyazo-whole-capture-onetime-absolute')
      item.style.position = 'absolute'
    })
  }

  function restoreFixedElement () {
    var fixedElms = document.getElementsByClassName('gyazo-whole-capture-onetime-absolute')
    Array.prototype.slice.apply(fixedElms).forEach(function (item) {
      item.classList.remove('gyazo-whole-capture-onetime-absolute')
      item.style.position = 'fixed'
    })
  }

  function lockScroll () {
    var overflow = document.documentElement.style.overflow
    var overflowY = document.documentElement.style.overflowY
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.overflowY = 'hidden'
    return {overflow: overflow, overflowY: overflowY}
  }

  function unlockScroll (old) {
    old = old || {overflow: 'auto', overflowY: 'auto'}
    document.documentElement.style.overflow = old.overflow
    document.documentElement.style.overflowY = old.overflowY
  }

  function getZoomAndScale () {
    var zoom = Math.round(window.outerWidth / window.innerWidth * 100) / 100
    var scale = window.devicePixelRatio / zoom
    // XXX: on Windows, when window is not maximum, it should tweak zoom.(Chrome zoom level 1 is 1.10)
    var isWindows = navigator.platform.match(/^win/i)
    var isMaximum = (window.outerHeight === screen.availHeight && window.outerWidth === screen.availWidth)
    if (isWindows && !isMaximum && zoom > 1.00 && zoom < 1.05) {
      zoom = 1.00
    }
    return {
      zoom: zoom,
      scale: scale
    }
  }

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    var actions = {
      changeFixedElementToAbsolute: function () {
        changeFixedElementToAbsolute()
        var waitScroll = function () {
          if (Math.abs(window.scrollX - request.scrollTo.x) < 1 && Math.abs(window.scrollY - request.scrollTo.y) < 1) {
            sendResponse()
          } else {
            window.requestAnimationFrame(waitScroll)
          }
        }
        window.requestAnimationFrame(waitScroll)
      },
      gyazoCaptureVisibleArea: function () {
        var data = {}
        var scaleObj = getZoomAndScale()
        data.w = window.innerWidth
        data.h = window.innerHeight
        data.x = window.scrollX
        data.y = window.scrollY
        data.t = document.title
        data.u = location.href
        data.s = scaleObj.scale
        data.z = scaleObj.zoom
        data.positionX = window.scrollX
        data.positionY = window.scrollY
        data.defaultPositon = window.scrollY
        data.innerHeight = window.innerHeight
        chrome.runtime.sendMessage(chrome.runtime.id, {
          action: 'gyazoCaptureWithSize',
          data: data,
          tab: request.tab
        }, function () {})
      },
      gyazoSelectElm: function () {
        const MARGIN = 3
        if (check_duplicate_capture()) {
          return false
        }
        var jackup = document.createElement('div')
        jackup.classList.add('gyazo-jackup-element')
        document.body.appendChild(jackup)
        var layer = document.createElement('div')
        layer.className = 'gyazo-crop-select-element'
        document.body.appendChild(layer)
        layer.style.background = 'rgba(92, 92, 92, 0.3)'
        layer.style.position = 'fixed'
        layer.style.pointerEvents = 'none'
        layer.style.zIndex = 2147483647 // Maximun number of 32bit Int
        var allElms = Array.prototype.slice.apply(document.body.querySelectorAll('*')).filter(function (item) {
          return !item.classList.contains('gyazo-crop-select-element')
        })
        var moveLayer = function (event) {
          var item = event.target
          event.stopPropagation()
          var rect = item.getBoundingClientRect()
          layer.style.width = rect.width + 'px'
          layer.style.height = rect.height + 'px'
          layer.style.left = rect.left + 'px'
          layer.style.top = rect.top + 'px'
        }
        var takeMargin = function () {
          layer.style.width = parseInt(window.getComputedStyle(layer).width, 10) + MARGIN * 2 + 'px'
          layer.style.height = parseInt(window.getComputedStyle(layer).height, 10) + MARGIN * 2 + 'px'
          layer.style.left = parseInt(window.getComputedStyle(layer).left, 10) - MARGIN + 'px'
          layer.style.top = parseInt(window.getComputedStyle(layer).top, 10) - MARGIN + 'px'
        }
        var keydownHandler = function (event) {
          if (event.keyCode === ESC_KEY_CODE) {
            cancel()
          }else if (isPressCommandKey(event)) {
            takeMargin()
          }
        }
        var keyUpHandler = function (event) {
          if (isPressCommandKey(event)) {
            layer.style.width = parseInt(window.getComputedStyle(layer).width, 10) - MARGIN * 2 + 'px'
            layer.style.height = parseInt(window.getComputedStyle(layer).height, 10) - MARGIN * 2 + 'px'
            layer.style.left = parseInt(window.getComputedStyle(layer).left, 10) + MARGIN + 'px'
            layer.style.top = parseInt(window.getComputedStyle(layer).top, 10) + MARGIN + 'px'
          }
        }
        var cancel = function () {
          document.body.removeChild(jackup)
          document.body.removeChild(layer)
          window.removeEventListener('contextmenu', cancel)
          document.removeEventListener('keydown', keydownHandler)
          document.removeEventListener('keyup', keyUpHandler)
          restoreFixedElement()
        }
        window.addEventListener('contextmenu', cancel)
        document.addEventListener('keydown', keydownHandler)
        document.addEventListener('keyup', keyUpHandler)
        var selectElement = function (event) {
          event.stopPropagation()
          event.preventDefault()
          allElms.forEach(function (item) {
            item.style.cursor = item.getAttribute('data-gyazo-memory-cursor')
            item.removeAttribute('data-gyazo-memory-cursor')
            item.removeEventListener('mouseover', moveLayer)
            item.removeEventListener('click', selectElement)
          })
          var data = {}
          var scaleObj = getZoomAndScale()
          data.w = parseFloat(layer.style.width)
          data.h = parseFloat(layer.style.height)
          data.x = window.scrollX + layer.offsetLeft
          data.y = window.scrollY + layer.offsetTop
          data.t = document.title
          data.u = location.href
          data.s = scaleObj.scale
          data.z = scaleObj.zoom
          data.positionX = window.scrollX
          data.positionY = window.scrollY
          data.innerHeight = window.innerHeight
          document.body.removeChild(layer)
          jackup.style.height = (window.innerHeight + JACKUP_HEIGHT) + 'px'
          window.removeEventListener('contextmenu', cancel)
          window.removeEventListener('keydown', keydownHandler)
          document.removeEventListener('keyup', keyUpHandler)
          if (layer.offsetTop >= 0 && layer.offsetTop + layer.offsetHeight <= window.innerHeight) {
            // Only when required scroll
            changeFixedElementToAbsolute()
          }
          var overflow = lockScroll()
          var finish = function () {
            if (document.getElementsByClassName('gyazo-crop-select-element').length > 0) {
              return window.requestAnimationFrame(finish)
            }
            chrome.runtime.sendMessage(chrome.runtime.id, {
              action: 'gyazoCaptureWithSize',
              data: data,
              tab: request.tab
            }, function () {
              restoreFixedElement()
              document.body.removeChild(jackup)
              unlockScroll(overflow)
            })
          }
          window.requestAnimationFrame(finish)
        }
        allElms.forEach(function (item) {
          var _cursor = window.getComputedStyle(item).cursor
          item.style.cursor = 'default'
          item.setAttribute('data-gyazo-memory-cursor', _cursor)
          item.addEventListener('mouseover', moveLayer)
          item.addEventListener('click', selectElement)
        })
      },
      gyazoCapture: function () {
        if (check_duplicate_capture()) {
          return false
        }
        var startX
        var startY
        var data = {}
        var tempUserSelect = document.body.style.webkitUserSelect
        var layer = document.createElement('div')
        var jackup = document.createElement('div')
        jackup.classList.add('gyazo-jackup-element')
        document.body.appendChild(jackup)
        var pageHeight = Math.max(document.body.clientHeight, document.body.offsetHeight, document.body.scrollHeight)
        layer.style.position = 'absolute'
        layer.style.left = document.body.clientLeft + 'px'
        layer.style.top = document.body.clientTop + 'px'
        layer.style.width = Math.max(document.body.clientWidth, document.body.offsetWidth, document.body.scrollWidth) + 'px'
        layer.style.height = pageHeight + 'px'
        layer.style.zIndex = 2147483647 // Maximun number of 32bit Int
        layer.style.cursor = 'crosshair'
        document.body.style.webkitUserSelect = 'none'
        var selectionElm = document.createElement('div')
        layer.appendChild(selectionElm)
        document.body.appendChild(layer)
        selectionElm.styleUpdate = function (styles) {
          Object.keys(styles).forEach(function (key) {
            selectionElm.style[key] = styles[key]
          })
        }
        selectionElm.styleUpdate({
          background: 'rgba(92, 92, 92, 0.3)',
          position: 'absolute'
        })
        var cancelGyazo = function () {
          document.body.removeChild(layer)
          document.body.removeChild(jackup)
          document.body.style.webkitUserSelect = tempUserSelect
          document.removeEventListener('keydown', keydownHandler)
          window.removeEventListener('contextmenu', cancelGyazo)
          restoreFixedElement()
        }
        var keydownHandler = function (event) {
          if (event.keyCode === ESC_KEY_CODE) {
            //  If press Esc Key, cancel it
            cancelGyazo()
          } else if (event.keyCode === SPACE_KEY_CODE) {
            // If press Space bar, capture visible area
            event.preventDefault()
            cancelGyazo()
            actions.gyazoCaptureVisibleArea(request)
          }
        }
        var mousedownHandler = function (e) {
          startX = e.pageX
          startY = e.pageY
          selectionElm.styleUpdate({
            border: '1px solid rgba(255, 255, 255, 0.8)',
            left: startX + 'px',
            top: startY + 'px'
          })
          layer.removeEventListener('mousedown', mousedownHandler)
          layer.addEventListener('mousemove', mousemoveHandler)
          layer.addEventListener('mouseup', mouseupHandler)
        }
        var mousemoveHandler = function (e) {
          selectionElm.styleUpdate({
            width: (Math.abs(e.pageX - startX) - 1) + 'px',
            height: (Math.abs(e.pageY - startY) - 1) + 'px',
            left: Math.min(e.pageX, startX) + 'px',
            top: Math.min(e.pageY, startY) + 'px'
          })
        }
        var mouseupHandler = function (e) {
          document.body.style.webkitUserSelect = tempUserSelect
          document.removeEventListener('keydown', keydownHandler)
          window.addEventListener('contextmenu', function (event) {
            cancelGyazo()
            event.preventDefault()
          })
          var scaleObj = getZoomAndScale()
          var rect = selectionElm.getBoundingClientRect()
          data.w = rect.width
          data.h = rect.height
          if (data.h < 1 || data.w < 1) {
            document.body.removeChild(layer)
            return false
          }
          data.x = rect.left + window.scrollX
          data.y = rect.top + window.scrollY
          data.t = document.title
          data.u = location.href
          data.s = scaleObj.scale
          data.z = scaleObj.zoom
          data.positionX = window.scrollX
          data.positionY = window.scrollY
          data.innerHeight = window.innerHeight
          document.body.removeChild(layer)
          var overflow = lockScroll()
          jackup.style.height = (window.innerHeight + JACKUP_HEIGHT) + 'px'
          // wait for rewrite by removeChild
          window.requestAnimationFrame(function () {
            chrome.runtime.sendMessage(chrome.runtime.id, {
              action: 'gyazoCaptureWithSize',
              data: data,
              tab: request.tab
            }, function () {
              document.body.removeChild(jackup)
              unlockScroll(overflow)
              restoreFixedElement()
            })
          })
        }
        layer.addEventListener('mousedown', mousedownHandler)
        document.addEventListener('keydown', keydownHandler)
        window.addEventListener('contextmenu', cancelGyazo)
      },
      gyazoWholeCapture: function () {
        if (check_duplicate_capture()) {
          return false
        }
        var overflow = lockScroll()
        var data = {}
        var scaleObj = getZoomAndScale()
        data.w = window.innerWidth
        data.h = Math.max(document.body.clientHeight, document.body.offsetHeight, document.body.scrollHeight)
        data.x = 0
        data.y = 0
        data.t = document.title
        data.u = location.href
        data.s = scaleObj.scale
        data.z = scaleObj.zoom
        data.positionX = window.scrollX
        data.positionY = window.scrollY
        data.innerHeight = window.innerHeight
        var jackup = document.createElement('div')
        jackup.classList.add('gyazo-jackup-element')
        document.body.appendChild(jackup)
        jackup.style.height = (data.h + 30) + 'px'
        chrome.runtime.sendMessage(chrome.runtime.id, {
          action: 'gyazoCaptureWithSize',
          data: data,
          tab: request.tab,
          notificationId: request.notificationId
        }, function () {
          document.body.removeChild(jackup)
          unlockScroll(overflow)
        })
      }
    }
    if (request.action in actions) {
      actions[request.action]()
    }
    return true
  })
})()
