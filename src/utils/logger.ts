import log4js from 'log4js'
import { logLevel } from '../config'

log4js.configure({
  appenders: {
    cheese: {
      type: 'file',
      filename: 'maa-core-server.log',
    },
  },
  categories: {
    default: {
      appenders: ['cheese'],
      level: 'all',
    },
  },
})

export const logger = {
  default: log4js.getLogger(),
  express: log4js.getLogger('express'),
  ffi: log4js.getLogger('ffi'),
}
