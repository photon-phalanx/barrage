export default class Barrage {
  constructor (config) {
    let {el} = config
    if (typeof el === 'string') el = document.querySelector(`#${el}`)
    el.style.position = 'absolute'
    let style = this.setElStyle(el)
    this.width = style.width
    this.height = style.height
  }
  setElStyle (el) {
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
}
