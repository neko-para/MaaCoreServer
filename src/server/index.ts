import express from 'express'
import { Singleton } from '../utils/singleton'
import { CoreLoader, type InstanceWrapper } from '../ffi'
import { logger } from '../utils/logger'
import { getEmulators } from '../device'
import { AsstMsg } from '../types/core'
import { defaultAdb } from '../device/utils'
import cors from 'cors'

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
    this.server.use(cors())
    this.server.use((req, res, next) => {
      switch (req.method) {
        case 'GET':
          logger.express.info('GET', req.path, req.query)
          break
        case 'POST':
          logger.express.info('POST', req.path, req.body)
          break
        default:
          logger.express.warn('Unknown request method', req.method, req.path, req.query, req.body)
      }
      next()
    })

    const callbackBind: Record<
      string,
      ((code: number, data: Record<string, string | number>) => boolean)[]
    > = {}
    const callbackCounter: Record<string, number> = {}
    const callbackCache: Record<string, [number, Record<string, unknown>][]> = {}
    const wrappers: Record<string, InstanceWrapper> = {}

    function makeSuccess<T extends Record<string | number, unknown>>(result: T) {
      return {
        success: true,
        result,
      }
    }

    function makeError(error: string) {
      return {
        success: false,
        error,
      }
    }

    this.server.get('/api/version', (req, res) => {
      res.send(
        makeSuccess({
          version: this.loader.GetVersion() ?? 'N/A',
        })
      )
    })

    this.server.get('/api/scan', async (req, res) => {
      res.send(
        makeSuccess({
          emulators: await (await getEmulators())(),
        })
      )
    })

    this.server.get('/api/listen', (req, res) => {
      const uuid = req.query.uuid as string

      if (!(uuid in wrappers)) {
        res.send(makeError('uuid not exists'))
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
        makeSuccess({
          id,
        })
      )
    })

    this.server.get('/api/unlisten', (req, res) => {
      const uuid = req.query.uuid as string

      if (!(uuid in wrappers)) {
        res.send(makeError('uuid not exists'))
        return
      }

      const id = req.query.id as string
      const multiId = `${uuid}/${id}`

      const rest = callbackCache[multiId] ?? []
      if (multiId in callbackCache) {
        delete callbackCache[multiId]
      }
      res.send(
        makeSuccess({
          rest,
        })
      )
    })

    this.server.get('/api/poll', (req, res) => {
      const uuid = req.query.uuid as string

      if (!(uuid in wrappers)) {
        res.send(makeError('uuid not exists'))
        return
      }

      const id = req.query.id as string
      const multiId = `${uuid}/${id}`

      const peek = ((req.query.peek as string | undefined) ?? '1') !== '0'
      const count = parseInt((req.query.count as string | undefined) ?? '1')

      let data: (typeof callbackCache)[string] = []
      if (peek) {
        data = callbackCache[multiId].slice(0, count)
      } else {
        data = callbackCache[multiId].splice(0, count)
      }
      res.send(
        makeSuccess({
          data,
        })
      )
    })

    this.server.get('/api/create', (req, res) => {
      const uuid = req.query.uuid as string
      const touchMode = (req.query.touch as string | undefined) ?? 'minitouch'

      this.callbacks[uuid] = CoreLoader.bindCallback((code, data) => {
        logger.ffi.info('Callback called with', code, data)
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

      res.send(makeSuccess({}))
    })

    this.server.post('/api/connect', (req, res) => {
      const body = req.body as {
        uuid: string
        address: string
        config: string
      }

      const uuid = body.uuid

      if (!(uuid in wrappers)) {
        res.send(makeError('uuid not exists'))
        return
      }

      const callId = wrappers[uuid].AsyncConnect(defaultAdb, body.address ?? '', body.config ?? '')
      callbackBind[uuid].push((code, data) => {
        if (code === AsstMsg.AsyncCallInfo && data.async_call_id === callId) {
          res.send(makeSuccess(data))
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
      logger.express.info(`Server listen on ${port} started`)
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
