'use strict'
require('./check-versions')()
//引用到的是config文件夹下的index.js文件
const config = require('../config')
if (!process.env.NODE_ENV) {
  //定义在node.js全局的process对象，如果没有定义开发环境或者生产环境，那么就把
  //config文件夹下的index.js文件dev.env.NODE_ENV属性赋值过去
  process.env.NODE_ENV = JSON.parse(config.dev.env.NODE_ENV)
}
//opn是一个可以调用默认软件打开网址图片，网址，文件内容的插件
//这里用它调用默认浏览器打开dev-server监听的端口，例如localhost:8080
//他的使用说明：http://blog.csdn.net/xmloveth/article/details/58350496
const opn = require('opn')
const path = require('path')
//使用node.js的express框架，创建Exppress应用
const express = require('express')
//使用webpack打包工具
const webpack = require('webpack')
//http-proxy-middleware是express的中间件，可以把http请求代理到其他服务器上，
//例如可以把:localhost:8080/api/xxx --> localhost:3000/api/xxx
//方便与服务器对接
const proxyMiddleware = require('http-proxy-middleware')
//这里可以通过配置process.env.NODE_ENV的内容来配置，使用wenpack的打包的配置文件
//testing或者production表示使用webpack的生产环境的配置文件，其他值就是使用开发环境
const webpackConfig = (process.env.NODE_ENV === 'testing' || process.env.NODE_ENV === 'production')
  ? require('./webpack.prod.conf')
  : require('./webpack.dev.conf')

// default port where dev server listens for incoming traffic
//dev-server ,如果没有在命令行里面输入，就使用dev.env.js里面配置的端口
//获取在config文件夹下的dev.env.js里面配置的端口
const port = process.env.PORT || config.dev.port
// automatically open browser, if not set will be false
//设置是否自动打开浏览器，如果没有设置就为false
const autoOpenBrowser = !!config.dev.autoOpenBrowser
// Define HTTP proxies to your custom API backend
// https://github.com/chimurai/http-proxy-middleware
// 定义代理的域名表
const proxyTable = config.dev.proxyTable
//创建express服务
const app = express()
//执行webpack打包源码并返回compiler对象
const compiler = webpack(webpackConfig)
//webpack-dev-middleware插件是把webpack打包compiler对象的源码，直接写到内存里
//而不是写到磁盘里面，再将这个中间件挂到express上，使用之后可提供这些编译的文件服务
//将这个插件挂到express的方式，app.use(devMiddleware)
const devMiddleware = require('webpack-dev-middleware')(compiler, {
  //设置访问路径为webpack配置中的output里面配置的路径
  publicPath: webpackConfig.output.publicPath,
  quiet: true
})
//这是将webpack的打包的源码，实现热重载的功能
const hotMiddleware = require('webpack-hot-middleware')(compiler, {
  log: false,//关闭日志的输出
  heartbeat: 2000//发送心跳包的平率
})
// force page reload when html-webpack-plugin template changes
// currently disabled until this is resolved:
// https://github.com/jantimon/html-webpack-plugin/issues/680
// compiler.plugin('compilation', function (compilation) {
//   compilation.plugin('html-webpack-plugin-after-emit', function (data, cb) {
//     hotMiddleware.publish({ action: 'reload' })
//     cb()
//   })
// })

// enable hot-reload and state-preserving
// compilation error display
// express使用热重载的功能hotMiddleware中间件
app.use(hotMiddleware)

// proxy api requests
//Object是一个全局的变量
//Object.keys()方法会返回一个由给定对象的自身可以枚举的属性的组成的数组
//注意这里返回的是属性而不是属性值
//具体详情：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
Object.keys(proxyTable).forEach(function (context) {
  //foreach()方法，context是形参，它代表数组里面的元素
  let options = proxyTable[context]
  if (typeof options === 'string') {
    //将string进行格式化
    //格式化options，例如将'www.example.com'变成{ target: 'www.example.com' }
    options = { target: options }
  }
  app.use(proxyMiddleware(options.filter || context, options))
})

// handle fallback for HTML5 history API
//让你的单页面路由处理更自然
app.use(require('connect-history-api-fallback')())

// serve webpack bundle output
app.use(devMiddleware)

// serve pure static assets
const staticPath = path.posix.join(config.dev.assetsPublicPath, config.dev.assetsSubDirectory)
//利用 Express 托管静态文件
//访问静态资源文件时，express.static 中间件会根据目录添加的顺序查找所需的文件。
//如果你希望所有通过 express.static 访问的文件都存放在一个“虚拟（virtual）”目录（即目录根本不存在）下面，可以通过为静态资源目录指定一个挂载路径的方式来实现，如下所示：
//现在，你就爱可以通过带有 “/static” 前缀的地址来访问 public 目录下面的文件了。
//http://localhost:3000/static/images/kitten.jpg
app.use(staticPath, express.static('./static'))

const uri = 'http://localhost:' + port

var _resolve
var _reject
var readyPromise = new Promise((resolve, reject) => {
  _resolve = resolve
  _reject = reject
})

var server
//端口查看器，查看端口是否被占用
var portfinder = require('portfinder')
//改变portfinder的默认端口
portfinder.basePort = port

console.log('> Starting dev server...')
// webpack-dev-middleware等待webpack完成所有编译打包之后输出提示语到控制台，表明服务正式启动
// 服务正式启动才自动打开浏览器进入页面
devMiddleware.waitUntilValid(() => {
  portfinder.getPort((err, port) => {
    //查看端口是否被占用它，如果被占用，就去报错，终止打包
    if (err) {
      _reject(err)
    }
    //没被占用，就把这个端口赋值
    process.env.PORT = port
    var uri = 'http://localhost:' + port
    console.log('> Listening at ' + uri + '\n')
    // when env is testing, don't need open it
    if (autoOpenBrowser && process.env.NODE_ENV !== 'testing') {
      opn(uri)
    }
    server = app.listen(port)
    _resolve()
  })
})

module.exports = {
  ready: readyPromise,
  close: () => {
    server.close()
  }
}
