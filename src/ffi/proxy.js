import { CoreLoader } from '.'

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
          console.log(key, ...args)
          return loader[key].call(loader, target.instance, ...args)
        }
      },
    }
  )
}
