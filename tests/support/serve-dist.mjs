import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { extname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
}

const projectDirectory = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const vercelConfig = JSON.parse(readFileSync(resolve(projectDirectory, 'vercel.json'), 'utf8'))
const immutableAstroHeader = vercelConfig.headers
  .find((rule) => rule.source === '/_astro/(.*)')
  ?.headers.find((header) => header.key === 'Cache-Control')?.value

export function createStaticServer({ distDirectory = resolve(projectDirectory, 'dist') } = {}) {
  const distRoot = resolve(distDirectory)

  return createServer(async (request, response) => {
    const filePath = resolveDistPath(request.url, distRoot)
    if (!filePath) {
      response.writeHead(400).end('Bad Request')
      return
    }

    try {
      const staticFilePath = await resolveStaticFile(filePath)
      const fileStats = await stat(staticFilePath)
      if (!fileStats.isFile()) {
        response.writeHead(404).end('Not Found')
        return
      }

      const headers = { 'Content-Type': MIME_TYPES[extname(staticFilePath)] ?? 'application/octet-stream' }
      if (staticFilePath.startsWith(resolve(distRoot, '_astro')) && immutableAstroHeader) {
        headers['Cache-Control'] = immutableAstroHeader
      }
      response.writeHead(200, headers).end(await readFile(staticFilePath))
    } catch (error) {
      if (isMissingFileError(error)) {
        response.writeHead(404).end('Not Found')
        return
      }
      response.writeHead(500).end('Internal Server Error')
    }
  })
}

async function resolveStaticFile(filePath) {
  try {
    return (await stat(filePath)).isDirectory() ? resolve(filePath, 'index.html') : filePath
  } catch (error) {
    if (isMissingFileError(error) && !extname(filePath)) return resolve(filePath, 'index.html')
    throw error
  }
}

function resolveDistPath(requestUrl, distRoot) {
  try {
    const pathname = decodeURIComponent((requestUrl ?? '/').split('?', 1)[0] ?? '/')
    if (!pathname.startsWith('/') || pathname.includes('\0')) return null

    const requestedPath = pathname.endsWith('/') ? `${pathname}index.html` : pathname
    const filePath = resolve(distRoot, `.${requestedPath}`)
    const pathFromRoot = relative(distRoot, filePath)
    return pathFromRoot.startsWith('..') || pathFromRoot === '' ? null : filePath
  } catch {
    return null
  }
}

function isMissingFileError(error) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number.parseInt(process.env.PORT ?? '4322', 10)
  const host = process.env.HOST ?? '127.0.0.1'
  createStaticServer().listen(port, host)
}
