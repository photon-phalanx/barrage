const SPACING = 30 // 从右往左的弹幕，前后2条的间距
const PADDING = 15 // 弹幕最上最下离边距的最小距离 实际不一定就是15 因为弹幕大小不定，高度除以弹幕大小不一定能整除，肯定还有空出来的
const SECOND = 5 // 弹幕显示的时间
export default class Barrage {
  constructor (config) {
    this._width = 0
    this._height = 0
    let {el, defaultFontColor = '#fff', speedRatio = 1} = config
    if (typeof el === 'string') el = document.querySelector(`#${el}`)
    this._el = el
    this._defaultFontColor = defaultFontColor
    // 弹幕移动速度，先不使用
    this.speedRatio = speedRatio
    this._barragePlayList = []
    this._autoAddTmpList = []
    this._fontSize = 14 // 先写死吧
    this._lineHeight = Math.floor(this._fontSize * 1.4)
    // 这个是用来记录各种类型的弹幕占用空间情况的,如果有空间，就整齐的放，否则就随机
    this._barrageUsage = {
      right: [],
      static: []
    }
    this._isShow = true
    this._init()
    // 设置初始canvas
    this._cacheCanvas = document.createElement('canvas')
    this._cacheCanvas.width = this._width
    this._cacheCanvas.height = this._height
    this._ctx = el.getContext('2d')
    this._cacheCanvasCtx = this._cacheCanvas.getContext('2d')
    this._cacheCanvasCtx.font = `${this._fontSize}px Arial`
    this._cacheCanvasCtx.save()
    window.requestAnimationFrame(this._draw.bind(this))
  }

  _init () {
    let style = this._setElStyle(this._el)
    this._width = style.width
    this._height = style.height
    this._initBarrageUsage()
  }

  _initBarrageUsage () {
    for (let i in this._barrageUsage) {
      this._barrageUsage[i] = Array.from({
        length: Math.floor(this._height / this._lineHeight)
      }, () => false)
    }
  }

  _setElStyle (el) {
    let style = el.style
    style.position = 'absolute'
    // style.left = '0'
    // style.right = '0'
    // style.top = '0'
    // style.bottom = '0'
    let {width, height} = el.parentNode.getBoundingClientRect()
    el.width = width
    el.height = height
    return {width, height}
  }

  // 计算出现的位置，并修改barrageUsage
  _initBarrage (mode, text) {
    let res = {}
    if (mode === 'right') {
      res.x = this._width
      let index = this._barrageUsage[mode].indexOf(false)
      if (~index) {
        this._barrageUsage[mode][index] = true
        res.y = Math.floor((index + 1) * this._lineHeight - (this._lineHeight - this._fontSize) / 2)
        res.index = index
      } else {
        res.y = Math.floor(Math.random() * (this._height - this._lineHeight) + this._lineHeight)
        res.index = null
      }
      res.offset = Math.floor(this._width / SECOND / 60) // 5是希望有5秒，60是requireAnimationFrame
    } else if (mode === 'top' || mode === 'bottom') {
      let fontWidth = this._cacheCanvasCtx.measureText(text).width
      res.x = (this._width - fontWidth) / 2
      if (res.x < 0) res.x = 0
      let index
      if (mode === 'top') index = this._barrageUsage.static.indexOf(false)
      else index = this._barrageUsage.static.lastIndexOf(false)
      if (~index) {
        this._barrageUsage.static[index] = true
        res.y = Math.floor(this._height - index * this._lineHeight - (this._lineHeight - this._fontSize) / 2)
        console.log(res.y)
        res.index = index
      } else {
        if (mode === 'top') {
          res.y = Math.floor(Math.random() * (this._height / 2 - this._lineHeight) + this._lineHeight)
        } else {
          res.y = Math.floor(Math.random() * (this._height / 2 - this._lineHeight) + this._lineHeight + this._height / 2)
        }
        res.index = null
      }
      res.leftCount = SECOND * 60
    }
    return res
  }

  // 使用addBarrage添加的弹幕，会立刻放到屏幕上
  addBarrage (arr) {
    arr.forEach(barrage => {
      let {color = this._defaultFontColor, mode = 'right', text} = barrage
      let detail = this._initBarrage(mode, text)
      this._barragePlayList.push(Object.assign(detail, {
        color,
        text,
        mode
      }))
    })
  }

  autoAddBarrage (arr) {
    arr = arr.filter((item) => {
      return typeof item.time === 'number'
    })
    this._autoAddTmpList = this._autoAddTmpList.concat(arr)
  }

  timeUpdate (time) {
    let addArr = []
    let arr = this._autoAddTmpList
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].time <= time) {
        let item = arr.splice(i, 1)[0]
        i--
        addArr.push(item)
      }
    }
    this.addBarrage(addArr)
  }

  // 清除自动添加的弹幕
  cleanAutoAddBarrageList () {
    this._autoAddTmpList = []
    return true
  }

  // 弹幕开关
  toggleShow () {
    this._isShow = !this._isShow
  }

  // 处理弹幕状态，返回true则需要从_barragePlayList中移除这条弹幕
  _dealNextTick (item) {
    if (item.mode === 'right') {
      let fontWidth = this._cacheCanvasCtx.measureText(item.text).width
      item.x -= item.offset
      if (item.x + fontWidth + SPACING < this._width) { // 弹幕完全显示了，并且空出间距了
        if (item.index) this._barrageUsage[item.mode][item.index] = false
        item.index = null
      }
      if (item.x + fontWidth < 0) return true // 弹幕移动到最左边
    } else if (item.mode === 'top' || item.mode === 'bottom') {
      item.leftCount--
      if (item.leftCount < 0) {
        if (item.index) this._barrageUsage.static[item.index] = false
        item.index = null
        return true
      }
    }
  }

  _draw () {
    // 测试双缓冲……
    if (this._isShow) {
      this._cacheCanvasCtx.clearRect(0, 0, this._width, this._height)
      for (let index = 0; index < this._barragePlayList.length; index++) {
        let item = this._barragePlayList[index]
        this._cacheCanvasCtx.fillStyle = item.color
        this._cacheCanvasCtx.fillText(item.text, item.x, item.y)
        let removeFlag = this._dealNextTick(item)
        if (removeFlag) {
          this._barragePlayList.splice(index, 1)
          index--
        }
        this._cacheCanvasCtx.restore()
      }
      this._ctx.clearRect(0, 0, this._width, this._height)
      this._ctx.drawImage(this._cacheCanvas, 0, 0, this._width, this._height)
    } else {
      this._ctx.clearRect(0, 0, this._width, this._height)
    }
    window.requestAnimationFrame(this._draw.bind(this))
  }
}
