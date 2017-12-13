const WebSocket = require('ws');

const data = require('./data.js')
let length = data.length

function shuffle (arr) {
  if (!arr.length) return []
  for (let i = 0; i< arr.length; i++) {
    let j = Math.floor(Math.random() * i)
    let tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

function generateArr () {
  let len = Math.floor(length * Math.random())
  let arr = shuffle(data.slice()).splice(0, len)
  return arr
}

function sendMsg (ws) {
  ws.send(JSON.stringify(generateArr()))
  setTimeout(sendMsg, Math.floor(Math.random() * 10000), ws)
}

const wss = new WebSocket.Server({ port: 10102 })
wss.on('connection', function (ws) {
  console.log('connected')
  ws.on('message', function (msg) {
    console.log(msg)
    sendMsg(ws)
  })
})
wss.on('error', function (e) {
  console.log(e)
})