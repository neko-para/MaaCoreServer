import type { Emulator } from './types'

export async function getEmulators() {
  const platform = process.platform
  if (platform === 'win32') {
    return (await import('./win')).getEmulators
  } else if (platform === 'darwin') {
    return () => [] as Emulator[]
    // return (await import('./macAdapter')).default
  } else {
    return () => [] as Emulator[]
    // return (await import('./linuxAdapter')).default
  }
}
