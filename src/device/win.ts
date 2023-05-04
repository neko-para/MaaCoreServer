import path from 'path'
import fs from 'fs/promises'
import { getUuid } from './utils'
import type { Emulator } from './types'
import { execa } from 'execa'
import { connect } from 'net'
import { logger } from '../utils/logger'
import { gb2312Decode, gb2312ToUtf8, utf8ToGb2312 } from '../utils/encoding'

// const inUsePorts: string[] = [] // 本次识别已被使用的端口，将会在此暂存。

const emulatorList = [
  'HD-Player.exe', // 蓝叠模拟器
  'LdVBoxHeadless.exe', // 雷电模拟器
  'NoxVMHandle.exe', // 夜神模拟器
  'NemuHeadless.exe', // mumu模拟器
  'MEmuHeadless.exe', // 逍遥模拟器
  'Ld9BoxHeadless.exe', // 雷电9
  'MuMuVMMHeadless.exe', // mumu12
]

type MaybeArray<T> = T | T[]
type AcceptKey = 'ExecutablePath' | 'ProcessId' | 'CommandLine' | 'Name'
type QueryOption<K extends AcceptKey = AcceptKey> = K extends unknown
  ? {
      [k in K]: string
    }
  : never

async function queryProcess<P extends AcceptKey>(option: QueryOption | null, property: P | P[]) {
  // await $`Get-WmiObject -Query "select ExecutablePath FROM Win32_Process where Name='${pname}'" | Select-Object -Property ExecutablePath | ConvertTo-Json`
  function buildWhere([key, value]: [string, string]) {
    return `where ${key}='${value}'`
  }

  const keys = property instanceof Array ? property.join(',') : property
  const where = option ? buildWhere(Object.entries(option)[0]) : ''
  const { stdout } = await execa('powershell', [
    `Get-WmiObject -Query "select ${keys} FROM Win32_Process ${where}" | Select-Object -Property ${keys} | ConvertTo-Json`,
  ])
  const result: MaybeArray<{
    [k in P]: k extends 'ProcessId' ? number : string
  }> = JSON.parse(stdout)
  return result instanceof Array ? result : [result]
}

async function testPort(port: number, timeout = 100) {
  return new Promise<boolean>(resolve => {
    const socket = connect(
      {
        timeout,
        port,
      },
      () => {
        resolve(true)
        socket.end()
      }
    ).on('error', () => {
      resolve(false)
      socket.end()
    })
  })
}

async function getNox(emulator: Emulator) {
  emulator.config = 'Nox'
  emulator.displayName = '夜神模拟器'
  const root = path.dirname(
    (
      await queryProcess(
        {
          Name: 'Nox.exe',
        },
        'ExecutablePath'
      )
    )[0].ExecutablePath
  )
  emulator.adbPath = path.resolve(root, 'nox_adb.exe')

  const noxConsole = path.resolve(root, 'NoxConsole.exe')

  for (const line of gb2312Decode((await execa(noxConsole, ['list'], { encoding: null })).stdout)
    .split(/[\r\n]+/)
    .map(x => x.split(','))) {
    if (line.length > 1 && (line.pop() as string) === emulator.pid) {
      emulator.commandLine = [noxConsole, ['launch', `-name:${line[2]}`]]
      const vmName = line[1]
      const configPath = path.resolve(root, 'BignoxVMS', vmName, `${vmName}.vbox`)
      if (!configPath) {
        logger.default.error('Nox config file not exist!', configPath)
        return
      }
      const config = await fs.readFile(configPath, 'utf-8')
      const getPortReg =
        /<Forwarding name="port2" proto="1" hostip="127.0.0.1" hostport="(\d{4,6})" guestport="5555"\/>/
      const configPort = config.match(getPortReg)
      if (configPort) {
        emulator.address = `127.0.0.1:${configPort[1]}`
      } else {
        logger.default.error("Nox config file doesn't contain port information!", configPath)
      }
    }
  }
}

export async function getEmulators() {
  const info = await queryProcess(null, ['ProcessId', 'Name'])
  const emulators: Emulator[] = info
    .map(({ ProcessId, Name }) => ({
      Name,
      ProcessId: ProcessId.toString(),
    }))
    .filter(({ Name }) => emulatorList.includes(Name))
    .map(({ Name, ProcessId }) => ({
      pname: Name,
      pid: ProcessId,
    }))

  await Promise.all(
    emulators.map(async e => {
      if (e.pname === 'NoxVMHandle.exe') {
        await getNox(e)
      }
    })
  )

  await Promise.all(
    emulators.map(async e => {
      const uuid = await getUuid(e.address ?? '')
      if (uuid) {
        e.uuid = uuid
      }
    })
  )

  return emulators.filter(e => {
    return !!(e.address && e.uuid && e.adbPath && e.config && e.commandLine && e.displayName)
  })
}
