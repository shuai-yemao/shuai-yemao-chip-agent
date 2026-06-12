/**
 * DeepSeek Anthropic 兼容 API 代理
 * 在请求转发前剥离 Claude Code 发送的不兼容参数
 * 使用方式: node bin/deepseek-proxy.js
 */

const http = require('http')
const https = require('https')
const { SocksProxyAgent } = require('socks-proxy-agent')

const LISTEN_PORT = 17999
const TARGET_HOST = 'api.deepseek.com'
const TARGET_PORT = 443
const TARGET_PATH = '/anthropic'
const SOCKS_PROXY = process.env.ALL_PROXY || 'socks5://127.0.0.1:7897'
const socksAgent = new SocksProxyAgent(SOCKS_PROXY)

const server = http.createServer((req, res) => {
  let body = []
  req.on('data', chunk => body.push(chunk))
  req.on('end', () => {
    const rawBody = Buffer.concat(body).toString('utf8')
    let modifiedBody = rawBody
    try {
      const parsed = JSON.parse(rawBody)
      if (parsed.reasoning_effort !== undefined) {
        console.log('[proxy] stripping reasoning_effort:', parsed.reasoning_effort)
        delete parsed.reasoning_effort
      }
      if (parsed.thinking && parsed.thinking.type === 'disabled') {
        console.log('[proxy] stripping thinking:', JSON.stringify(parsed.thinking))
        delete parsed.thinking
      }
      modifiedBody = JSON.stringify(parsed)
    } catch (e) { /* passthrough */ }

    const options = {
      hostname: TARGET_HOST, port: TARGET_PORT,
      path: TARGET_PATH + (req.url || ''),
      method: req.method,
      headers: { ...req.headers, 'host': TARGET_HOST, 'content-length': Buffer.byteLength(modifiedBody) },
      agent: socksAgent,
    }

    const proxyReq = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers)
      proxyRes.pipe(res)
    })
    proxyReq.on('error', (e) => { res.writeHead(502); res.end('Proxy Error: ' + e.message) })
    proxyReq.write(modifiedBody)
    proxyReq.end()
  })
})

server.listen(LISTEN_PORT, () => {
  console.log('DeepSeek API proxy on http://localhost:' + LISTEN_PORT)
  console.log('Forwarding to https://' + TARGET_HOST + TARGET_PATH)
})
