const PADDING = 30 // 从右往左的弹幕，前后2条的间距

export default class Barrage {
  constructor (config) {
    this._width = 0
    this._height = 0
    let {el, defaultFontColor = '#fff', speedRatio = 1} = config
    if (typeof el === 'string') el = document.querySelector(`#${el}`)
    this._el = el
    this._ctx = el.getContext('2d')
    this._defaultFontColor = defaultFontColor
    // 弹幕移动速度，先不使用
    this.speedRatio = speedRatio
    this._barragePlayList = []
    this._fontSize = 12 // 先写死吧
    this._lineHeight = Math.floor(this._fontSize * 1.4)
    // 这个是用来记录各种类型的弹幕占用空间情况的,如果有空间，就整齐的放，否则就随机
    this._barrageUsage = {
      right: [],
      static: []
    }
    this._init()
    this._ctx.font = `${this._fontSize}px serif`
    this._ctx.save()
    console.log('called')
    window.requestAnimationFrame(this._draw.bind(this))
  }
  _init () {
    let style = this._setElStyle(this._el)
    this._width = style.width
    this._height = style.height
    this._initBarrageUsage()
  }
  _initBarrageUsage () {
    this._barrageUsage.right = this._barrageUsage.static = Array.from({
      length: Math.floor(this._height / this._lineHeight)
    }, () => false)
  }
  _setElStyle (el) {
    let style = el.style
    style.position = 'absolute'
    // style.left = '0'
    // style.right = '0'
    // style.top = '0'
    // style.bottom = '0'
    let {width, height} = el.parentNode.getBoundingClientRect()
    console.log(width)
    el.width = width
    el.height = height
    return {width, height}
  }
  // 计算出现的位置，并修改barrageUsage
  _initBarrage (mode, text) {
    let res = {}
    switch (mode) {
      case 'right':
        res.x = this._width
        let index = this._barrageUsage.right.indexOf(false)
        if (~index) {
          this._barrageUsage.right[index] = true
          res.y = Math.floor((index + 1) * this._lineHeight)
          res.index = index
        } else {
          console.log('else')
          res.y = Math.floor(Math.random() * (this._height - this._lineHeight) + this._lineHeight)
          console.log(res.y)
          res.index = null
        }
        res.offset = Math.floor(this._width / 5 / 60) // 5是希望有5秒，60是requireAnimationFrame
        break
      case 'static':
        break
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
  }
  timeUpdate (time) {
  }
  // 处理弹幕状态，返回true则需要从_barragePlayList中移除这条弹幕
  _dealNextTick (item) {
    if (item.mode === 'right') {
      let fontWidth = this._ctx.measureText(item.text).width
      item.x -= item.offset
      if (item.x + fontWidth + PADDING < this._width) { // 弹幕完全显示了，并且空出间距了
        if (item.index) this._barrageUsage.right[item.index] = false
        item.index = null
      }
      if (item.x + fontWidth < 0) return true // 弹幕移动到最左边
    }
  }
  _draw () {
    if (this._barragePlayList.length) {
      this._ctx.clearRect(0, 0, this._width, this._height)
      for (let index = 0; index < this._barragePlayList.length; index++) {
        let item = this._barragePlayList[index]
        this._ctx.fillStyle = item.color
        this._ctx.fillText(item.text, item.x, item.y)
        let removeFlag = this._dealNextTick(item)
        if (removeFlag) {
          this._barragePlayList.splice(index, 1)
          index--
        }
        this._ctx.restore()
      }
    }
    window.requestAnimationFrame(this._draw.bind(this))
  }
}
