// {
//     text: '',
//     mode: 'right'
// }
// {
//     src: '',
//     mode: 'image'
// }
const SPACING = 30 // 从右往左的弹幕，前后2条的间距
const PADDING = 10 // 弹幕最上最下离边距的最小距离 实际不一定就是15 因为弹幕大小不定，高度除以弹幕大小不一定能整除，肯定还有空出来的
const SECOND = 5 // 弹幕显示的时间

function getStrLength (str) {
  let l = str.length
  let blen = 0
  for (let i = 0; i < l; i++) {
    if ((str.charCodeAt(i) & 0xff00) !== 0) {
      blen++
    }
    blen++
  }
  return blen
}

export default class Barrage {
  constructor (config) {
    this._width = 0
    this._height = 0
    this._el = ''
    this._ctx = ''
    this.initConfig = config
    this._isShow = true
    this._continueRecursion = false
    // 但是,cencelAnimationFrames有兼容性问题，可能将requestAnimationFrame放到init之外
    this.animationFrames = 0
    this._barrageTypeHandler = {
      // 状态模式
    }
    this._config = {
      color: '#ffffff',
      speedRatio: 1,
      fontSize: 14,
      imageHeight: 30,
      hideStopMethod: true // 如果为true，则在隐藏弹幕的时候清空弹幕列表，并停止递归，性能较好。若为false，只是看不到弹幕，但弹幕仍然在后面移动，重新显示弹幕时能看到对应的位置。
    }
    this._barrageUsage = {
      right: [],
      image: []
    }
    this._barragePlayList = {
      right: [],
      image: []
    }
    this._barrageWaitList = {
      right: [],
      image: []
    }
    this._initBarrageTypeHandler()
    this._init()
  }

  _initBarrageTypeHandler () {
    let self = this
    Object.assign(self._barrageTypeHandler, {
      right: {
        initBarrageUsage (i) {
          self._barrageUsage[i] = Array.from({
            length: Math.floor(self._height / self._config.fontSize / 1.5)
          }, () => null)
        },
        prepareBarrage (barrage) {
          barrage.x = self._width
          self._barrageWaitList[barrage.mode] && self._barrageWaitList[barrage.mode].push(barrage)
          self._startDraw()
        },
        calcPosition (barrage) {
          let fontWidth = self._cacheCanvasCtx.measureText(barrage.text).width
          barrage.x -= barrage.offset
          if (barrage.x + fontWidth + SPACING < self._width) { // 弹幕完全显示了，并且空出间距了
            if (typeof barrage.index === 'number') self._barrageUsage[barrage.mode][barrage.index] = null
            barrage.index = null
          }
          if (barrage.x + fontWidth <= 0) { // 显示完了，移除
            return true
          }
          return false
        },
        insertBarrage (barrage, index) {
          barrage.y = Math.floor((index + 1) * self._config.fontSize * 1.5 - (self._config.fontSize * 1.5 - self._config.fontSize) / 2)
          barrage.offset = Math.floor(self._width / SECOND / 60 * self._config.speedRatio * (getStrLength(barrage.text) / 10 + 1))
        },
        draw (barrage) {
          self._cacheCanvasCtx.fillStyle = barrage.color
          self._cacheCanvasCtx.fillText(barrage.text, barrage.x, barrage.y)
          self._cacheCanvasCtx.restore()
        }
      },
      image: {
        initBarrageUsage (i) {
          self._barrageUsage[i] = Array.from({
            length: Math.floor(self._height / (self._config.imageHeight + PADDING))
          }, () => null)
        },
        prepareBarrage (barrage) {
          barrage.x = self._width
          barrage.img = new Image()
          barrage.img.onload = () => {
            barrage.width = barrage.img.width
            self._barrageWaitList[barrage.mode] && self._barrageWaitList[barrage.mode].push(barrage)
            self._startDraw()
          }
          barrage.img.src = barrage.src
        },
        calcPosition (barrage) {
          let width = barrage.width
          barrage.x -= barrage.offset
          if (barrage.x + width + SPACING < self._width) { // 弹幕完全显示了，并且空出间距了
            if (typeof barrage.index === 'number') self._barrageUsage[barrage.mode][barrage.index] = null
            barrage.index = null
          }
          if (barrage.x + width <= 0) { // 显示完了，移除
            return true
          }
          return false
        },
        insertBarrage (barrage, index) {
          barrage.y = Math.floor(index * (self._config.imageHeight + PADDING) + PADDING)
          barrage.offset = Math.floor(self._width / SECOND / 60 / self._config.speedRatio)
        },
        draw (barrage) {
          self._cacheCanvasCtx.drawImage(barrage.img, barrage.x, barrage.y)
          self._cacheCanvasCtx.restore()
        }
      }
    })
  }

  _startDraw () {
    if (!this._continueRecursion) {
      this._continueRecursion = true
      this.animationFrames = window.requestAnimationFrame(this._draw.bind(this))
    }
  }

  _clearBarrage () {
    this._initBarrageUsage()
    for (let type in this._barragePlayList) {
      this._barragePlayList[type] = []
    }
    for (let type in this._barrageWaitList) {
      this._barrageWaitList[type] = []
    }
  }

  _setConfig (config) {
    this._config = Object.assign(this._config, config)
  }

  _setCanvasDefault (el) {
    let style = el.style
    style.position = 'absolute'
    style.zIndex = '1000'
    // style.pointerEvents = 'none'
    let {width, height} = el.parentNode.getBoundingClientRect()
    this._width = el.width = width
    this._height = el.height = height
    this._ctx = el.getContext('2d')
  }

  _init () {
    typeof this.initConfig.el === 'string' ? this._el = document.querySelector(`#${this.initConfig.el}`) : this._el = this.initConfig.el
    if (!this._el) throw new Error('未找到挂载的元素,请检查el选项')
    this._setConfig(this.initConfig)
    this._setCanvasDefault(this._el)
    this._initBarrageUsage()
    this._initCacheCanvas()
    this._startDraw()
  }

  // 双缓冲优化，这个canvas是隐藏的，在上面画完后，1次性复制到显示出来的canvas上面
  _initCacheCanvas () {
    this._cacheCanvas = document.createElement('canvas')
    this._cacheCanvas.width = this._width
    this._cacheCanvas.height = this._height
    this._cacheCanvasCtx = this._cacheCanvas.getContext('2d')
    this._cacheCanvasCtx.font = `${this._config.fontSize}px Arial`
    this._cacheCanvasCtx.save()
  }

  // 开始计算视频的高度下能排下几行弹幕
  _initBarrageUsage () {
    for (let i in this._barrageUsage) {
      if (this._barrageUsage.hasOwnProperty(i)) {
        this._barrageTypeHandler[i].initBarrageUsage(i)
      }
    }
  }

  _handleNextTick () {
    // 已有的做移动
    for (let type in this._barragePlayList) {
      if (this._barragePlayList.hasOwnProperty(type)) {
        for (let i = 0; i < this._barragePlayList[type].length; i++) {
          let barrage = this._barragePlayList[type][i]
          let removeFlag = this._barrageTypeHandler[type].calcPosition(barrage)
          if (removeFlag) {
            this._barragePlayList[type].splice(i, 1)
            i--
          }
        }
      }
    }
    // 添加新的
    for (let type in this._barragePlayList) {
      if (this._barragePlayList.hasOwnProperty(type)) {
        if (~this._barrageUsage[type].indexOf(null)) {
          let index
          while (this._barrageWaitList[type].length && ~(index = this._barrageUsage[type].indexOf(null))) {
            // 有空位并且有新弹幕，插入barrageUsage和barrageList
            let barrage = this._barrageWaitList[type].pop()
            barrage.index = index
            this._barrageTypeHandler[type].insertBarrage(barrage, index)
            this._barrageUsage[type][index] = barrage
            this._barragePlayList[type].push(barrage)
          }
        }
      }
    }
  }

  _draw () {
    if (this._isShow) {
      this._cacheCanvasCtx.clearRect(0, 0, this._width, this._height)
      for (let type in this._barragePlayList) {
        if (this._barragePlayList.hasOwnProperty(type)) {
          for (let index = 0; index < this._barragePlayList[type].length; index++) {
            let item = this._barragePlayList[type][index]
            this._barrageTypeHandler[type].draw(item)
          }
        }
      }
      this._ctx.clearRect(0, 0, this._width, this._height)
      this._ctx.drawImage(this._cacheCanvas, 0, 0, this._width, this._height)
    } else {
      this._ctx.clearRect(0, 0, this._width, this._height)
    }
    this._handleNextTick()
    this._designRecursion()
    this._continueRecursion && window.requestAnimationFrame(this._draw.bind(this))
  }

  _designRecursion () {
    if (!this._isShow) {
      this._continueRecursion = false
      return
    }
    let stopFlag = true
    for (let type in this._barragePlayList) {
      if (this._barragePlayList.hasOwnProperty(type)) {
        if (this._barragePlayList[type].length) stopFlag = false
      }
    }
    if (stopFlag) {
      this._continueRecursion = false
      return
    }
    this._continueRecursion = true
  }

  // 直接添加到等待列表中
  addBarrage (arr) {
    if (!this._isShow) return
    arr.forEach(barrage => {
      barrage = Object.assign({
        mode: 'right',
        color: this._config.color,
        // 这里可能以后要根据大中小来修改fontSize的设置
        fontSize: this._config.fontSize
      }, barrage)
      this._barrageTypeHandler[barrage.mode].prepareBarrage(barrage)
    })
  }

  toggleShow () {
    this._isShow = !this._isShow
    if (this._isShow) this._startDraw()
    else {
      if (this._config.hideStopMethod) this._clearBarrage()
    }
  }

  show () {
    this._isShow = true
    this._startDraw()
  }

  hide () {
    this._isShow = false
    if (this._config.hideStopMethod) this._clearBarrage()
  }

  refresh () {
    this._setCanvasDefault(this._el)
    this._initBarrageUsage()
    this._clearBarrage()
    this._cacheCanvasCtx.clearRect(0, 0, this._width, this._height)
    this._startDraw()
  }
}
