import { CoreLoader } from '.'
import { logger } from '../utils/logger'

export function createWrapper(instance) {
  const loader = new CoreLoader()

  return new Proxy(
    { instance },
    {
      get(target, key) {
        if (key in target) {
          return target[key]
        }
        return (...args) => {
          logger.ffi.info('Called via proxy:', key, ...args)
          return loader[key].call(loader, target.instance, ...args)
        }
      },
    }
  )
}
