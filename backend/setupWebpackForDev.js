const express = require('express')
const webpack = require('webpack')
const middleware = require('webpack-dev-middleware')
const hrm = require('webpack-hot-middleware')

const webpackConfig = require('../webpack.config.js')
const config = require('./config')

const router = express.Router()

module.exports = () => {
  const compiler = webpack(webpackConfig)

  if (config.app.production === false) {
    router.use(middleware(compiler, { writeToDisk: true }))
    router.use(hrm(compiler, {}))
  }

  return router
}
