import axios from 'axios'

async function main() {
  const uuid = '7de18ff4cf6c5dee'

  const session = axios.create({
    baseURL: 'http://localhost:5555/api',
  })
  console.log(
    'Create',
    (
      await session.get('/create', {
        params: {
          uuid,
        },
      })
    ).data
  )
  console.log(
    'Listen',
    (
      await session.get('/listen', {
        params: {
          uuid,
        },
      })
    ).data
  )
  console.log(
    'Connect',
    (
      await session.post('/connect', {
        uuid,
        // adb: 'depends/platform-tools/adb.exe',
        address: '127.0.0.1:62001',
        config: 'Nox',
      })
    ).data
  )
}

main()
