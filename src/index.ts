import { CoreLoader } from './ffi'
import { AsstMsg } from './types/core'
import { Server } from './server'
import { getUuid } from './device/utils'
import { getEmulators } from './device/win'

// const loader = new CoreLoader()

// loader.load()

// loader.SetUserDir('.')
// loader.LoadResource('.\\depends\\core')

// const inst = loader.CreateEx(
//   CoreLoader.bindCallback((code, data) => {
//     console.log(code, data)
//     // if (code === AsstMsg.ConnectionInfo)
//   })
// )

// console.log(loader.SetInstanceOption(inst.instance, 2, 'minitouch'))
// // console.log(loader.AsyncConnect(inst.instance, 'C:\\Program Files (x86)\\Nox\\bin\\nox_adb.exe', '', 'Nox'))
// console.log(inst.AsyncConnect('depends/platform-tools/adb.exe', '127.0.0.1:62001', 'Nox'))

const server = new Server()
const close = server.listen()

// process.on('SIGINT', () => {
//   close().then(() => {
//     console.log('quit!')
//     process.exit(0)
//   })
// })
