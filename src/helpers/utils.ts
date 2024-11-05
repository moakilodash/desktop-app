export const parseRpcUrl = (url: string) => {
  try {
    const [credentials, hostPort] = url.split('@')
    const [username, password] = credentials.split(':')
    const [host, port] = hostPort.split(':')
    return { host, password, port: parseInt(port, 10), username }
  } catch {
    return {
      host: 'localhost',
      password: 'password',
      port: 18443,
      username: 'user',
    }
  }
}
