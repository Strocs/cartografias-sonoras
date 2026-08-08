import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { createStaticServer } from './serve-dist.mjs'

async function startFixtureServer() {
  const distDirectory = await mkdtemp(join(tmpdir(), 'cartografias-dist-'))
  await writeFile(join(distDirectory, 'index.html'), 'ok')
  const server = createStaticServer({ distDirectory })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('Expected TCP server address')

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
}

test('rejects decoded traversal and malformed request paths', async () => {
  const fixture = await startFixtureServer()

  try {
    const traversal = await requestPath(fixture.origin, '/%2e%2e/package.json')
    const malformed = await requestPath(fixture.origin, '/%E0%A4%A')

    assert.equal(traversal.status, 400)
    assert.equal(malformed.status, 400)
  } finally {
    await fixture.close()
  }
})

function requestPath(origin, path) {
  const url = new URL(origin)
  return new Promise((resolve, reject) => {
    const requestHandle = request({ hostname: url.hostname, port: url.port, path }, (response) =>
      resolve({ status: response.statusCode })
    )
    requestHandle.on('error', reject)
    requestHandle.end()
  })
}
