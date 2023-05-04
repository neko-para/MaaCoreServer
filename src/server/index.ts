import express from 'express'
import { Singleton } from '../utils/singleton'
import { CoreLoader, type InstanceWrapper } from '../ffi'
import { logger } from '../utils/logger'
import { getEmulators } from '../device'
import { AsstMsg } from '../types/core'
import { defaultAdb } from '../device/utils'

function castString(value: any, def?: null): string | null
function castString(value: any, def: string): string
function castString(value: any, def: string | null = null): string | null {
  if (typeof value !== 'string') {
    return def
  } else {
    return value
  }
}

@Singleton
export class Server {
  loader: CoreLoader
  server: express.Application
  callbacks: Record<string, Buffer>

  constructor() {
    this.loader = new CoreLoader()
    this.server = express()
    this.callbacks = {}

    this.server.use(express.json())

    const callbackBind: Record<
      string,
      ((code: number, data: Record<string, string | number>) => boolean)[]
    > = {}
    const callbackCounter: Record<string, number> = {}
    const callbackCache: Record<string, [number, Record<string, unknown>][]> = {}
    const wrappers: Record<string, InstanceWrapper> = {}

    this.server.get('/api/version', (req, res) => {
      res.send(
        JSON.stringify({
          success: true,
          result: {
            version: this.loader.GetVersion() ?? 'N/A',
          },
        })
      )
    })

    this.server.get('/api/scan', async (req, res) => {
      res.send(
        JSON.stringify({
          success: true,
          result: {
            emulators: await (await getEmulators())(),
          },
        })
      )
    })

    this.server.get('/api/listen', (req, res) => {
      const uuid = castString(req.query.uuid)
      if (!uuid) {
        res.send(
          JSON.stringify({
            success: false,
            error: 'uuid required',
          })
        )
        return
      }
      const id = callbackCounter[uuid]
      callbackCounter[uuid] = id + 1
      const multiId = `${uuid}/${id}`
      callbackCache[multiId] = []

      callbackBind[uuid].push((code, data) => {
        const keep = multiId in callbackCache
        if (!keep) {
          return false
        }
        callbackCache[multiId].push([code, data])
        return true
      })
      res.send(
        JSON.stringify({
          success: true,
          result: {
            id,
          },
        })
      )
    })

    this.server.get('/api/unlisten', (req, res) => {
      const uuid = castString(req.query.uuid)
      if (!uuid) {
        res.send(
          JSON.stringify({
            success: false,
            error: 'uuid required',
          })
        )
        return
      }
      const id = castString(req.query.id)
      if (!id) {
        res.send(
          JSON.stringify({
            success: false,
            error: 'id required',
          })
        )
        return
      }
      const multiId = `${uuid}/${id}`
      const rest = callbackCache[multiId] ?? []
      if (multiId in callbackCache) {
        delete callbackCache[multiId]
      }
      res.send(
        JSON.stringify({
          success: true,
          result: {
            rest,
          },
        })
      )
    })

    this.server.get('/api/poll', (req, res) => {
      const uuid = castString(req.query.uuid)
      if (!uuid) {
        res.send(
          JSON.stringify({
            success: false,
            error: 'uuid required',
          })
        )
        return
      }
      const id = castString(req.query.id)
      if (!id) {
        res.send(
          JSON.stringify({
            success: false,
            error: 'id required',
          })
        )
        return
      }
      const multiId = `${uuid}/${id}`
      const peek = castString(req.query.peek, '1') !== '0'
      let countStr = castString(req.query.count, '1')
      let count = parseInt(countStr)
      if (isNaN(count) || count < 0) {
        count = 0
      }
      let data: (typeof callbackCache)[string] = []
      if (peek) {
        data = callbackCache[multiId].slice(0, count)
      } else {
        data = callbackCache[multiId].splice(0, count)
      }
      res.send(
        JSON.stringify({
          success: true,
          result: {
            data,
          },
        })
      )
    })

    this.server.get('/api/create', (req, res) => {
      const uuid = req.query.uuid
      if (!uuid || typeof uuid !== 'string') {
        res.send(
          JSON.stringify({
            success: false,
            error: 'uuid required',
          })
        )
        return
      }
      let touchMode = req.query.touch
      if (typeof touchMode !== 'string' || !['minitouch', 'maatouch', 'adb'].includes(touchMode)) {
        touchMode = 'minitouch'
      }

      this.callbacks[uuid] = CoreLoader.bindCallback((code, data) => {
        logger.info('Callback called with', code, data)
        const pdata = JSON.parse(data)
        callbackBind[uuid] =
          callbackBind[uuid]?.filter(fn => {
            return fn(code, pdata)
          }) ?? []
      })

      const wrapper = this.loader.CreateEx(this.callbacks[uuid])

      wrapper.SetInstanceOption(2, touchMode)

      wrappers[uuid] = wrapper

      callbackBind[uuid] = []
      callbackCounter[uuid] = 0

      res.send(
        JSON.stringify({
          success: true,
          result: {},
        })
      )
    })

    this.server.post('/api/connect', (req, res) => {
      const body = req.body as {
        uuid?: string
        adb?: string
        address?: string
        config?: string
      }
      const uuid = body.uuid
      if (!uuid || typeof uuid !== 'string') {
        res.send(
          JSON.stringify({
            success: false,
            error: 'uuid required',
          })
        )
        return
      }
      if (!(uuid in wrappers)) {
        res.send(
          JSON.stringify({
            success: false,
            error: 'uuid not exists',
          })
        )
        return
      }
      const callId = wrappers[uuid].AsyncConnect(defaultAdb, body.address ?? '', body.config ?? '')
      callbackBind[uuid].push((code, data) => {
        if (code === AsstMsg.AsyncCallInfo && data.async_call_id === callId) {
          res.send(
            JSON.stringify({
              success: true,
              result: data,
            })
          )
          return false
        }
        return true
      })
    })
  }

  listen(port = 5555) {
    this.loader.load()
    this.loader.config()

    const svr = this.server.listen(port, () => {
      logger.info(`Server listen on ${port} started`)
    })

    return () => {
      // TODO: Stop all task
      this.loader.dispose()
      return new Promise<void>(resolve => {
        svr.close(() => {
          resolve()
        })
      })
    }
  }
}
